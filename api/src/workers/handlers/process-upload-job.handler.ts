import type { Job } from "bullmq";
import { createBullMqProgressReporter } from "../adapters/progress/bullmq-progress.reporter";
import type {
  ProcessUploadInput,
  ProcessUploadResult,
  UseCaseRuntime,
} from "../../engine/application/contracts/upload-engine.contracts";
import type { UploadWorkerLogger } from "../utils/worker-logger";
import type { UploadJobData } from "./upload-job.types";

type ProcessUploadHandler = (
  input: ProcessUploadInput,
  runtime?: UseCaseRuntime,
) => Promise<ProcessUploadResult>;

interface ProcessUploadJobHandlerDependencies {
  processUpload: ProcessUploadHandler;
  logger: UploadWorkerLogger;
}

export function createProcessUploadJobHandler(
  dependencies: ProcessUploadJobHandlerDependencies,
) {
  return async function handleProcessUploadJob(
    job: Job<UploadJobData>,
  ): Promise<void> {
    const result = await dependencies.processUpload(
      {
        uploadId: job.data.uploadId,
        tenantId: job.data.tenantId,
      },
      {
        progressReporter: createBullMqProgressReporter(job),
      },
    );

    dependencies.logger.logSuggestedMappingReady(
      job.data.uploadId,
      result.columnCount,
    );
  };
}
