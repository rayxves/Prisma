/**
 * server.ts — Ponto de entrada da aplicação
 *
 * Inicia:
 *  1. API REST Express (porta configurável via PORT)
 *  2. Worker BullMQ da engine de diagnóstico/predição
 *
 * Em produção, o worker pode ser movido para um processo separado
 * (ex: `worker.ts` standalone) escalonando de forma independente.
 */

import "dotenv/config";
import app from "./app";
import { startUploadWorker } from "./workers/upload.worker";

const PORT = process.env["PORT"] ?? 3001;

// ── API HTTP ──────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Prisma API rodando em http://localhost:${PORT}`);
});

// ── Engine Worker (BullMQ) ────────────────────────────────────────────────────
const worker = startUploadWorker();
console.log("⚙️  Engine de diagnóstico e predição iniciada.");

// ── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} recebido — encerrando graciosamente...`);
  await worker.close();
  server.close(() => {
    console.log("Servidor HTTP encerrado.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
