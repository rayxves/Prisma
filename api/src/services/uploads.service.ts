import { Queue } from 'bullmq';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../shared/errors/app-error';

const uploadQueue = new Queue('uploads', {
  connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
});

export async function createUpload(
  tenantId:     string,
  userId:       string,
  filename:     string,
  originalName: string,
) {
  const upload = await prisma.rawUpload.create({
    data: { tenantId, userId, filename, originalName, status: 'PENDING' },
  });

  try {
    await uploadQueue.add(
      'process-upload',
      { uploadId: upload.id, tenantId },
      { jobId: upload.id, attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  } catch (err) {
    await prisma.rawUpload.update({
      where: { id: upload.id },
      data:  { status: 'ERROR', errorMessage: 'Falha ao enfileirar processamento' },
    });
    throw err;
  }

  return upload;
}

export async function listUploads(tenantId: string) {
  return prisma.rawUpload.findMany({
    where:   { tenantId },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, originalName: true, status: true, createdAt: true, updatedAt: true, errorMessage: true },
  });
}

export async function getUploadById(tenantId: string, id: string) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new NotFoundError('Upload não encontrado');
  return upload;
}

export async function getColumnMapping(tenantId: string, id: string) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new NotFoundError('Upload não encontrado');

  const readyStatuses = ['AWAITING_MAPPING', 'DONE'];
  if (!readyStatuses.includes(upload.status)) {
    throw new ValidationError(`Upload ainda não está pronto para mapeamento. Status atual: ${upload.status}`);
  }

  return {
    uploadId:         upload.id,
    originalName:     upload.originalName,
    suggestedMapping: upload.suggestedMapping,
  };
}

export async function confirmMapping(
  tenantId:  string,
  id:        string,
  mapping:   Record<string, string>,
  branchId:  string,
) {
  const upload = await prisma.rawUpload.findFirst({ where: { id, tenantId } });
  if (!upload) throw new NotFoundError('Upload não encontrado');

  if (upload.status !== 'AWAITING_MAPPING') {
    throw new ValidationError('Este upload não está aguardando mapeamento');
  }

  await uploadQueue.add(
    'insert-data',
    { uploadId: id, tenantId, mapping, branchId },
    { jobId: `insert-${id}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  );

  await prisma.rawUpload.update({
    where: { id },
    data:  { mapping, branchId, status: 'PROCESSING' },
  });

  return { message: 'Mapeamento confirmado. Inserção dos dados iniciada.' };
}
