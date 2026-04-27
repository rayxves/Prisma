import type { UploadPipelineObserver } from "../../engine/application/contracts/upload-engine.contracts";
import type { UploadWorkerLogger } from "./worker-logger";

export function createUploadPipelineLoggingObserver(
  logger: UploadWorkerLogger,
): UploadPipelineObserver {
  return {
    onRowsCleaned(event) {
      logger.logRowsCleaned({
        uploadId: event.uploadId,
        validRows: event.validRows,
        discardedRows: event.discardedRows,
        outliersCapped: event.outliersCapped,
      });
    },

    onDiagnosticsComputed(event) {
      logger.logDiagnostics({
        uploadId: event.uploadId,
        roi: event.roi,
        margin: event.margin,
      });
    },

    onModelTrained(event) {
      logger.logModelTrained(event.uploadId, event.model);
    },

    onModelTrainingSkipped(event) {
      logger.logModelTrainingSkipped(event.uploadId, event.encodedRowCount);
    },
  };
}
