import {
  countAnomaliesByDay,
  detectAnomalies,
} from "../../core/anomaly/anomaly-detector";
import { cleanRows, encodeForML } from "../../core/cleaner/data-cleaner";
import { computeDiagnostics } from "../../core/diagnostics/diagnostics-calculator";
import {
  projectFutureSales,
  selectFeatures,
  trainModel,
} from "../../core/ml/sales-forecasting";
import type {
  AnomalyRepository,
  BranchRepository,
  DailyMetricsRepository,
  InsertUploadDataInput,
  InsertUploadDataResult,
  SalesRepository,
  UploadFileGateway,
  UploadRepository,
  UseCaseRuntime,
} from "../contracts/upload-engine.contracts";
import { readUploadFileOrMarkError } from "../support/load-upload-file";
import {
  getPipelineObserver,
  getProgressReporter,
} from "../support/use-case-runtime";

const INSERT_DATA_PROGRESS = {
  parsed: 10,
  cleaned: 25,
  salesInserted: 50,
  diagnosticsReady: 65,
  metricsPersisted: 80,
  finalizing: 95,
} as const;

interface InsertUploadDataDependencies {
  uploadRepository: UploadRepository;
  uploadFileGateway: Pick<UploadFileGateway, "readUpload">;
  branchRepository: BranchRepository;
  salesRepository: SalesRepository;
  anomalyRepository: AnomalyRepository;
  dailyMetricsRepository: DailyMetricsRepository;
}

function applyAnomalyCounts(
  anomalyCountByDay: Map<string, number>,
  dailyMetrics: ReturnType<typeof computeDiagnostics>["daily"],
): void {
  dailyMetrics.forEach((dailyMetric) => {
    const dayKey = dailyMetric.date.toISOString().slice(0, 10);
    dailyMetric.anomaliesCount = anomalyCountByDay.get(dayKey) ?? 0;
  });
}

async function resolveBranchId(
  mapping: Record<string, string>,
  tenantId: string,
  branchRepository: BranchRepository,
): Promise<string> {
  return (
    (mapping["branch_id"] as string) ??
    (await branchRepository.findOrCreateDefaultBranchId(tenantId))
  );
}

export function createInsertUploadDataUseCase(
  dependencies: InsertUploadDataDependencies,
) {
  return async function insertUploadData(
    input: InsertUploadDataInput,
    runtime?: UseCaseRuntime,
  ): Promise<InsertUploadDataResult> {
    const progressReporter = getProgressReporter(runtime);
    const observer = getPipelineObserver(runtime);

    const upload = await dependencies.uploadRepository.findByIdAndTenant(
      input.uploadId,
      input.tenantId,
    );

    if (!upload) {
      throw new Error(`Upload ${input.uploadId} não encontrado`);
    }

    const parsedUpload = await readUploadFileOrMarkError(
      input.uploadId,
      upload.filename,
      dependencies.uploadRepository,
      dependencies.uploadFileGateway,
    );

    await progressReporter.update(INSERT_DATA_PROGRESS.parsed);

    const cleanResult = cleanRows(parsedUpload.rows, input.mapping);

    await observer.onRowsCleaned?.({
      uploadId: input.uploadId,
      validRows: cleanResult.rows.length,
      discardedRows: cleanResult.discarded,
      outliersCapped: cleanResult.outliersCapped,
    });

    if (cleanResult.rows.length === 0) {
      await dependencies.uploadRepository.updateStatus(input.uploadId, "ERROR");
      throw new Error(
        "Nenhuma linha válida após limpeza. Verifique o mapeamento e o arquivo.",
      );
    }

    await progressReporter.update(INSERT_DATA_PROGRESS.cleaned);

    const branchId = await resolveBranchId(
      input.mapping,
      input.tenantId,
      dependencies.branchRepository,
    );

    await dependencies.salesRepository.saveSales(
      input.tenantId,
      branchId,
      cleanResult.rows,
    );
    await progressReporter.update(INSERT_DATA_PROGRESS.salesInserted);

    const diagnostics = computeDiagnostics(cleanResult.rows, branchId);

    await observer.onDiagnosticsComputed?.({
      uploadId: input.uploadId,
      roi: diagnostics.branch.roi,
      margin: diagnostics.branch.margin,
    });
    await progressReporter.update(INSERT_DATA_PROGRESS.diagnosticsReady);

    const anomalies = detectAnomalies(diagnostics.daily);

    await dependencies.anomalyRepository.saveAnomalies(
      input.tenantId,
      anomalies,
    );

    const anomalyCountByDay = countAnomaliesByDay(anomalies);
    applyAnomalyCounts(anomalyCountByDay, diagnostics.daily);

    await dependencies.dailyMetricsRepository.saveDailyMetrics(
      input.tenantId,
      diagnostics.daily,
    );
    await progressReporter.update(INSERT_DATA_PROGRESS.metricsPersisted);

    const { encoded } = encodeForML(cleanResult.rows);

    if (encoded.length >= 30) {
      const selectedFeatures = selectFeatures(encoded);
      const model = trainModel(encoded, selectedFeatures, 60, 0.08);
      const projections = projectFutureSales(
        model,
        branchId,
        30,
        encoded.slice(-50),
      );

      await dependencies.uploadRepository.saveModelMetadata(
        input.uploadId,
        input.mapping,
        model,
        projections,
      );
      await observer.onModelTrained?.({
        uploadId: input.uploadId,
        model,
      });
    } else {
      await observer.onModelTrainingSkipped?.({
        uploadId: input.uploadId,
        encodedRowCount: encoded.length,
      });
    }

    await progressReporter.update(INSERT_DATA_PROGRESS.finalizing);
    await dependencies.uploadRepository.updateStatus(input.uploadId, "DONE");

    return {
      filePath: parsedUpload.filePath,
      anomalyCount: anomalies.length,
    };
  };
}
