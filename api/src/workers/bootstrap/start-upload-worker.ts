import { Job, Worker } from "bullmq";
import { createInsertUploadDataUseCase } from "../../engine/application/use-cases/insert-upload-data.use-case";
import { createProcessUploadUseCase } from "../../engine/application/use-cases/process-upload.use-case";
import { createPrismaAnomalyRepository } from "../adapters/persistence/prisma-anomaly.repository";
import { createPrismaBranchRepository } from "../adapters/persistence/prisma-branch.repository";
import { createPrismaDailyMetricsRepository } from "../adapters/persistence/prisma-daily-metrics.repository";
import { createPrismaSalesRepository } from "../adapters/persistence/prisma-sales.repository";
import { createPrismaUploadRepository } from "../adapters/persistence/prisma-upload.repository";
import { createLocalUploadFileGateway } from "../adapters/storage/local-upload-file.gateway";
import { createInsertUploadDataJobHandler } from "../handlers/insert-upload-data-job.handler";
import { createProcessUploadJobHandler } from "../handlers/process-upload-job.handler";
import type {
  InsertDataJobData,
  UploadJobData,
} from "../handlers/upload-job.types";
import {
  createWorkerLogger,
  type UploadWorkerLogger,
} from "../utils/worker-logger";

const UPLOAD_QUEUE_NAME = "uploads";

const redisConnection = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
};

interface UploadWorkerHandlers {
  logger: UploadWorkerLogger;
  processUploadJob: (job: Job<UploadJobData>) => Promise<void>;
  insertUploadDataJob: (job: Job<InsertDataJobData>) => Promise<void>;
}

function createUploadWorkerHandlers(): UploadWorkerHandlers {
  const logger = createWorkerLogger();
  const uploadRepository = createPrismaUploadRepository();
  const uploadFileGateway = createLocalUploadFileGateway();
  const branchRepository = createPrismaBranchRepository();
  const salesRepository = createPrismaSalesRepository();
  const anomalyRepository = createPrismaAnomalyRepository();
  const dailyMetricsRepository = createPrismaDailyMetricsRepository();

  const processUpload = createProcessUploadUseCase({
    uploadRepository,
    uploadFileGateway,
  });
  const insertUploadData = createInsertUploadDataUseCase({
    uploadRepository,
    uploadFileGateway,
    branchRepository,
    salesRepository,
    anomalyRepository,
    dailyMetricsRepository,
  });

  return {
    logger,
    processUploadJob: createProcessUploadJobHandler({
      processUpload,
      logger,
    }),
    insertUploadDataJob: createInsertUploadDataJobHandler({
      insertUploadData,
      uploadFileGateway,
      logger,
    }),
  };
}

async function routeUploadJob(
  job: Job,
  handlers: UploadWorkerHandlers,
): Promise<void> {
  switch (job.name) {
    case "process-upload":
      return handlers.processUploadJob(job as Job<UploadJobData>);
    case "insert-data":
      return handlers.insertUploadDataJob(job as Job<InsertDataJobData>);
    default:
      handlers.logger.warnUnknownJob(job.name);
  }
}

function attachWorkerEventLogging(
  worker: Worker,
  logger: UploadWorkerLogger,
): void {
  worker.on("completed", (job) => {
    logger.logWorkerCompleted(job);
  });

  worker.on("failed", (job, error) => {
    logger.logWorkerFailed(job, error);
  });

  worker.on("stalled", (jobId) => {
    logger.logWorkerStalled(jobId);
  });
}

export function startUploadWorker(): Worker {
  const handlers = createUploadWorkerHandlers();

  const worker = new Worker(
    UPLOAD_QUEUE_NAME,
    async (job: Job) => routeUploadJob(job, handlers),
    {
      connection: redisConnection,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60_000,
      },
    },
  );

  attachWorkerEventLogging(worker, handlers.logger);
  return worker;
}
