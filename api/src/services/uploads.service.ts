import { Queue } from 'bullmq';
import { prisma } from '../lib/prisma';

// ─── Queue ────────────────────────────────────────────────────────────────────
// Certifique-se de ter REDIS_HOST e REDIS_PORT no .env
const uploadQueue = new Queue('uploads', {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});

// ─── Create Upload ────────────────────────────────────────────────────────────
// Salva o registro no banco com status PENDING e enfileira o job de processamento
export async function createUpload(
  tenantId: string,
  userId: string,
  filename: string,
  originalName: string
) {
  const upload = await prisma.rawUpload.create({
    data: { tenantId, userId, filename, originalName, status: 'PENDING' },
  });

  // O worker vai ler o arquivo, detectar colunas e gerar suggestedMapping
  await uploadQueue.add(
    'process-upload',
    { uploadId: upload.id, tenantId },
    { jobId: upload.id, attempts: 3, backoff: { type: 'exponential', delay: 3000 } }
  );

  return upload;
}

// ─── List Uploads ─────────────────────────────────────────────────────────────
export async function listUploads(tenantId: string) {
  return prisma.rawUpload.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, originalName: true, status: true, createdAt: true, updatedAt: true },
  });
}

// ─── Get Upload by ID ─────────────────────────────────────────────────────────
export async function getUploadById(tenantId: string, id: string) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new Error('Upload não encontrado');
  return upload;
}

// ─── Get Column Mapping ───────────────────────────────────────────────────────
// O worker já executou fuzzy matching e armazenou as sugestões em `suggestedMapping`
export async function getColumnMapping(tenantId: string, id: string) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new Error('Upload não encontrado');

  const readyStatuses = ['AWAITING_MAPPING', 'DONE'];
  if (!readyStatuses.includes(upload.status)) {
    throw new Error(`Upload ainda não está pronto para mapeamento. Status atual: ${upload.status}`);
  }

  return {
    uploadId: upload.id,
    originalName: upload.originalName,
    suggestedMapping: upload.suggestedMapping, // Json salvo pelo worker
  };
}

// ─── Confirm Mapping ──────────────────────────────────────────────────────────
// Recebe o mapeamento confirmado pelo usuário e dispara a inserção real no banco
export async function confirmMapping(
  tenantId: string,
  id: string,
  mapping: Record<string, string>
) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new Error('Upload não encontrado');

  if (upload.status !== 'AWAITING_MAPPING') {
    throw new Error('Este upload não está aguardando mapeamento');
  }

  await prisma.rawUpload.update({
    where: { id },
    data: { mapping, status: 'PROCESSING' },
  });

  // Job separado para inserção — usa jobId único para evitar duplicatas
  await uploadQueue.add(
    'insert-data',
    { uploadId: id, tenantId, mapping },
    { jobId: `insert-${id}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );

  return { message: 'Mapeamento confirmado. Inserção dos dados iniciada.' };
}
