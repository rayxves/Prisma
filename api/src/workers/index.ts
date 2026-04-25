import { Worker } from 'bullmq';

import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { createUploadWorker } from './upload.worker';

let workers: Worker[] = [];

export function startWorkers(): void {
  redis.ping().then(() => {
    logger.info('[workers] Redis conectado — iniciando workers');
    workers = [createUploadWorker()];
    logger.info('[workers] Upload worker iniciado');
  }).catch((err: Error) => {
    logger.error('[workers] Redis indisponível — workers não iniciados', { message: err.message });
  });
}

export async function closeWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  logger.info('[workers] Todos os workers encerrados');
}
