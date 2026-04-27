import type { Job } from "bullmq";
import { createBullMqProgressReporter } from "../adapters/progress/bullmq-progress.reporter";
import { createUploadPipelineLoggingObserver } from "../utils/upload-pipeline-logging.observer";
import type {
  InsertUploadDataInput,
  InsertUploadDataResult,
  UploadFileGateway,
  UseCaseRuntime,
} from "../../engine/application/contracts/upload-engine.contracts";
import type { UploadWorkerLogger } from "../utils/worker-logger";
import type { InsertDataJobData } from "./upload-job.types";

const INSERT_DATA_COMPLETED_PROGRESS = 100;

type InsertUploadDataHandler = (
  input: InsertUploadDataInput,
  runtime?: UseCaseRuntime,
) => Promise<InsertUploadDataResult>;

interface InsertUploadDataJobHandlerDependencies {
  insertUploadData: InsertUploadDataHandler;
  uploadFileGateway: Pick<UploadFileGateway, "deleteUpload">;
  logger: UploadWorkerLogger;
}

function createRuntime(job: Job, logger: UploadWorkerLogger): UseCaseRuntime {
  return {
    progressReporter: createBullMqProgressReporter(job),
    observer: createUploadPipelineLoggingObserver(logger),
  };
}

export function createInsertUploadDataJobHandler(
  dependencies: InsertUploadDataJobHandlerDependencies,
) {
  return async function handleInsertUploadDataJob(
    job: Job<InsertDataJobData>,
  ): Promise<void> {
    const result = await dependencies.insertUploadData(
      {
        uploadId: job.data.uploadId,
        tenantId: job.data.tenantId,
        mapping: job.data.mapping,
      },
      createRuntime(job, dependencies.logger),
    );

    await dependencies.uploadFileGateway.deleteUpload(result.filePath);
    await job.updateProgress(INSERT_DATA_COMPLETED_PROGRESS);
    dependencies.logger.logPipelineCompleted(
      job.data.uploadId,
      result.anomalyCount,
    );
  };
}
