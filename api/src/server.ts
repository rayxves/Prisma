import fs from "node:fs";

import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { redis } from "./config/redis";
import { prisma } from "./lib/prisma";
import { closeWorkers, startWorkers } from "./workers/index";

async function bootstrap() {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

  try {
    await prisma.$connect();
    logger.info("Banco de dados conectado");
  } catch (err) {
    logger.error("Falha ao conectar ao banco de dados", { err });
    process.exit(1);
  }

  startWorkers();

  const server = app.listen(env.PORT, () => {
    logger.info(`Prisma API rodando em http://localhost:${env.PORT}`);
  });

  async function shutdown(signal: string) {
    logger.info(`${signal} recebido, encerrando servidor...`);

    server.close(async () => {
      logger.info("Servidor HTTP fechado");

      await closeWorkers();
      await prisma.$disconnect();
      redis.disconnect();

      logger.info("Encerramento concluido");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Timeout de encerramento atingido, forcando saida");
      process.exit(1);
    }, 30_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void bootstrap();
