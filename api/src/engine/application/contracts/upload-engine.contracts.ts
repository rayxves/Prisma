import type { AnomalyResult } from "../../core/anomaly/anomaly-detector";
import type { CleanRow } from "../../core/cleaner/data-cleaner";
import type { DailyDiagnostic } from "../../core/diagnostics/diagnostics-calculator";
import type {
  BoostedModel,
  SalesProjection,
} from "../../core/ml/sales-forecasting";
import type { SuggestedMapping } from "../../core/mapping/suggested-mapping-builder";

export type UploadStatus = "PROCESSING" | "AWAITING_MAPPING" | "ERROR" | "DONE";

export interface UploadRecord {
  id: string;
  filename: string;
  tenantId: string;
}

export interface ParsedUploadFile {
  filePath: string;
  rows: Record<string, string>[];
  columns: string[];
}

export interface UploadRepository {
  updateStatus(uploadId: string, status: UploadStatus): Promise<void>;
  findByIdAndTenant(
    uploadId: string,
    tenantId: string,
  ): Promise<UploadRecord | null>;
  saveSuggestedMapping(
    uploadId: string,
    suggestedMapping: SuggestedMapping,
  ): Promise<void>;
  saveModelMetadata(
    uploadId: string,
    mapping: Record<string, string>,
    model: BoostedModel,
    projections: SalesProjection[],
  ): Promise<void>;
}

export interface UploadFileGateway {
  readUpload(filename: string): Promise<ParsedUploadFile>;
  deleteUpload(filePath: string): Promise<void>;
}

export interface BranchRepository {
  findOrCreateDefaultBranchId(tenantId: string): Promise<string>;
}

export interface SalesRepository {
  saveSales(
    tenantId: string,
    branchId: string,
    rows: CleanRow[],
  ): Promise<void>;
}

export interface AnomalyRepository {
  saveAnomalies(tenantId: string, anomalies: AnomalyResult[]): Promise<void>;
}

export interface DailyMetricsRepository {
  saveDailyMetrics(tenantId: string, metrics: DailyDiagnostic[]): Promise<void>;
}

export interface ProgressReporter {
  update(progress: number): Promise<void>;
}

export interface RowsCleanedEvent {
  uploadId: string;
  validRows: number;
  discardedRows: number;
  outliersCapped: number;
}

export interface DiagnosticsComputedEvent {
  uploadId: string;
  roi: number;
  margin: number;
}

export interface ModelTrainedEvent {
  uploadId: string;
  model: BoostedModel;
}

export interface ModelTrainingSkippedEvent {
  uploadId: string;
  encodedRowCount: number;
}

type MaybePromise<T> = T | Promise<T>;

export interface UploadPipelineObserver {
  onRowsCleaned?(event: RowsCleanedEvent): MaybePromise<void>;
  onDiagnosticsComputed?(event: DiagnosticsComputedEvent): MaybePromise<void>;
  onModelTrained?(event: ModelTrainedEvent): MaybePromise<void>;
  onModelTrainingSkipped?(event: ModelTrainingSkippedEvent): MaybePromise<void>;
}

export interface UseCaseRuntime {
  progressReporter?: ProgressReporter;
  observer?: UploadPipelineObserver;
}

export interface ProcessUploadInput {
  uploadId: string;
  tenantId: string;
}

export interface ProcessUploadResult {
  columnCount: number;
}

export interface InsertUploadDataInput {
  uploadId: string;
  tenantId: string;
  mapping: Record<string, string>;
}

export interface InsertUploadDataResult {
  filePath: string;
  anomalyCount: number;
}

export class UploadFileNotFoundError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`Arquivo não encontrado: ${filePath}`);
    this.filePath = filePath;
    this.name = "UploadFileNotFoundError";
  }
}
