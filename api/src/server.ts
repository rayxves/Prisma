import fs from 'node:fs';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { redis } from './config/redis';
import app from './app';
import { startWorkers, closeWorkers } from './workers/index';

async function bootstrap() {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

  try {
    await prisma.$connect();
    logger.info('Banco de dados conectado');
  } catch (err) {
    logger.error('Falha ao conectar ao banco de dados', { err });
    process.exit(1);
  }

  startWorkers();

  const server = app.listen(env.PORT, () => {
    logger.info(`Prisma API rodando em http://localhost:${env.PORT}`);
  });

  async function shutdown(signal: string) {
    logger.info(`${signal} recebido — encerrando servidor...`);

    server.close(async () => {
      logger.info('Servidor HTTP fechado');

      await closeWorkers();
      await prisma.$disconnect();
      redis.disconnect();

      logger.info('Encerramento concluído');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Timeout de encerramento atingido — forçando saída');
      process.exit(1);
    }, 30_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap();
