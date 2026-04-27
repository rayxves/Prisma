import type { Job } from "bullmq";
import type { BoostedModel } from "../../engine/core/ml/sales-forecasting";

export interface UploadWorkerLogger {
  logSuggestedMappingReady(uploadId: string, columnCount: number): void;
  logRowsCleaned(details: {
    uploadId: string;
    validRows: number;
    discardedRows: number;
    outliersCapped: number;
  }): void;
  logDiagnostics(details: {
    uploadId: string;
    roi: number;
    margin: number;
  }): void;
  logModelTrained(uploadId: string, model: BoostedModel): void;
  logModelTrainingSkipped(uploadId: string, encodedRowCount: number): void;
  logPipelineCompleted(uploadId: string, anomalyCount: number): void;
  warnUnknownJob(jobName: string): void;
  logWorkerCompleted(job: Job): void;
  logWorkerFailed(job: Job | undefined | null, error: Error): void;
  logWorkerStalled(jobId: string): void;
}

function getProcessingTime(job: Job): number {
  const processedOn = job.processedOn ?? 0;
  const timestamp = job.timestamp ?? 0;
  return processedOn - timestamp;
}

export function createWorkerLogger(): UploadWorkerLogger {
  return {
    logSuggestedMappingReady(uploadId, columnCount) {
      console.log(
        `[worker] process-upload ${uploadId}: ${columnCount} colunas detectadas, sugestão gerada.`,
      );
    },

    logRowsCleaned({ uploadId, validRows, discardedRows, outliersCapped }) {
      console.log(
        `[worker] insert-data ${uploadId}: ${validRows} linhas válidas, ` +
          `${discardedRows} descartadas, ${outliersCapped} outliers capados.`,
      );
    },

    logDiagnostics({ uploadId, roi, margin }) {
      console.log(
        `[worker] insert-data ${uploadId}: ROI=${roi}%, Margem=${margin}%`,
      );
    },

    logModelTrained(uploadId, model) {
      console.log(
        `[worker] insert-data ${uploadId}: modelo treinado R²=${model.r2}, RMSE=${model.rmse}, ` +
          `features=${model.featuresUsed.join(", ")}`,
      );
    },

    logModelTrainingSkipped(uploadId, encodedRowCount) {
      console.log(
        `[worker] insert-data ${uploadId}: dados insuficientes para treinar modelo (n=${encodedRowCount}<30)`,
      );
    },

    logPipelineCompleted(uploadId, anomalyCount) {
      console.log(
        `[worker] insert-data ${uploadId}: pipeline completo. ${anomalyCount} anomalias detectadas.`,
      );
    },

    warnUnknownJob(jobName) {
      console.warn(`[worker] Job desconhecido: ${jobName}`);
    },

    logWorkerCompleted(job) {
      console.log(
        `[worker] ✅ ${job.name} (${job.id}) concluído em ${getProcessingTime(job)}ms`,
      );
    },

    logWorkerFailed(job, error) {
      console.error(
        `[worker] ❌ ${job?.name} (${job?.id}) falhou: ${error.message}`,
      );
    },

    logWorkerStalled(jobId) {
      console.warn(`[worker] ⚠️ Job ${jobId} travou — será re-enfileirado`);
    },
  };
}
