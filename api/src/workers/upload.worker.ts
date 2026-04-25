import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { Job, Worker } from 'bullmq';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../lib/prisma';
import { saleRowSchema, SaleRowInput } from '../schemas/sale.schema';
import { logAction } from '../services/audit-logs.service';
import { buildSuggestedMapping } from '../utils/fuzzy';

const BATCH_SIZE      = 500;
const FUZZY_THRESHOLD = 0.4;

const INTERNAL_FIELDS = [
  'data_venda',
  'valor_bruto',
  'custo_total',
  'categoria',
  'produto_nome',
  'quantidade',
  'external_id',
] as const;

interface ProcessUploadData {
  uploadId:  string;
  tenantId:  string;
}

interface InsertDataJobData {
  uploadId:  string;
  tenantId:  string;
  mapping:   Record<string, string>;
  branchId:  string;
}


async function extractHeaders(filePath: string, ext: string): Promise<string[]> {
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result  = Papa.parse<Record<string, unknown>>(content, { header: true, preview: 1 });
    return result.meta.fields ?? [];
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet   = workbook.worksheets[0];
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? '')));
  return headers;
}

async function readAllRows(filePath: string, ext: string): Promise<Record<string, unknown>[]> {
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result  = Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: true });
    return result.data;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? '')));

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell((cell, colIdx) => {
      const header = headers[colIdx - 1];
      if (header) obj[header] = cell.value;
    });
    rows.push(obj);
  });
  return rows;
}

function applyMapping(
  row:     Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [internalField, fileColumn] of Object.entries(mapping)) {
    result[internalField] = row[fileColumn];
  }
  return result;
}

function generateHash(row: SaleRowInput): string {
  const content = [
    row.data_venda.toISOString(),
    row.valor_bruto,
    row.custo_total,
    row.produto_nome,
    row.quantidade,
  ].join('|');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 32);
}

async function parseAndValidateRows(
  filePath: string,
  ext:      string,
  mapping:  Record<string, string>,
): Promise<{ rows: SaleRowInput[]; errors: string[] }> {
  const rawRows = await readAllRows(filePath, ext);
  const rows:   SaleRowInput[] = [];
  const errors: string[]       = [];

  rawRows.forEach((rawRow, index) => {
    const mapped = applyMapping(rawRow, mapping);
    const result = saleRowSchema.safeParse(mapped);
    if (result.success) {
      rows.push(result.data);
    } else {
      const messages = result.error.issues.map((i) => i.message).join(', ');
      errors.push(`Linha ${index + 2}: ${messages}`);
    }
  });

  return { rows, errors };
}

async function recalcDailyMetrics(
  branchId: string,
  tenantId: string,
  dates:    Date[],
): Promise<void> {
  for (const date of dates) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const agg = await prisma.sale.aggregate({
      where: { branchId, tenantId, saleDate: { gte: dayStart, lte: dayEnd } },
      _sum:  { grossValue: true, totalCost: true },
    });

    const totalSales = Number(agg._sum.grossValue ?? 0);
    const totalCost  = Number(agg._sum.totalCost  ?? 0);
    const roiDay     = totalCost  > 0 ? ((totalSales - totalCost) / totalCost)  * 100 : 0;
    const marginDay  = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

    await prisma.dailyMetrics.upsert({
      where:  { date_branchId: { date: dayStart, branchId } },
      update: { totalSales, roiDay, marginDay },
      create: { date: dayStart, branchId, tenantId, totalSales, roiDay, marginDay },
    });
  }
}

async function handleProcessUpload(job: Job<ProcessUploadData>): Promise<void> {
  const { uploadId, tenantId } = job.data;

  const upload = await prisma.rawUpload.findFirst({ where: { id: uploadId, tenantId } });
  if (!upload) throw new Error(`Upload ${uploadId} não encontrado`);

  const filePath = path.join(env.UPLOAD_DIR, upload.filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${upload.filename}`);
  }

  const ext     = path.extname(upload.filename).toLowerCase();
  const headers = await extractHeaders(filePath, ext);

  if (headers.length === 0) throw new Error('Nenhuma coluna detectada no arquivo');

  const suggestedMapping = buildSuggestedMapping(headers, INTERNAL_FIELDS, FUZZY_THRESHOLD);

  await prisma.rawUpload.update({
    where: { id: uploadId },
    data:  { suggestedMapping, status: 'AWAITING_MAPPING' },
  });

  logger.info(`[worker] process-upload concluído: ${uploadId} (${headers.length} colunas)`);
}

async function handleInsertData(job: Job<InsertDataJobData>): Promise<void> {
  const { uploadId, tenantId, mapping, branchId } = job.data;

  const upload = await prisma.rawUpload.findFirst({ where: { id: uploadId, tenantId } });
  if (!upload) throw new Error(`Upload ${uploadId} não encontrado`);

  const filePath = path.join(env.UPLOAD_DIR, upload.filename);
  const ext      = path.extname(upload.filename).toLowerCase();

  const { rows, errors } = await parseAndValidateRows(filePath, ext, mapping);

  if (rows.length === 0) {
    throw new Error(`Nenhuma linha válida encontrada. Erros: ${errors.slice(0, 5).join('; ')}`);
  }

  const affectedDates = new Set<string>();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch     = rows.slice(i, i + BATCH_SIZE);
    const salesData = batch.map((row) => {
      const dateKey = row.data_venda.toISOString().split('T')[0]!;
      affectedDates.add(dateKey);
      return {
        externalId:  row.external_id ?? generateHash(row),
        saleDate:    row.data_venda,
        grossValue:  row.valor_bruto,
        totalCost:   row.custo_total,
        category:    row.categoria,
        productName: row.produto_nome,
        quantity:    row.quantidade,
        branchId,
        tenantId,
      };
    });

    await prisma.sale.createMany({ data: salesData, skipDuplicates: true });
  }

  const dates = Array.from(affectedDates).map((d) => new Date(d));
  await recalcDailyMetrics(branchId, tenantId, dates);

  await prisma.rawUpload.update({
    where: { id: uploadId },
    data:  { status: 'DONE' },
  });

  try {
    fs.unlinkSync(filePath);
  } catch {
    logger.warn(`[worker] Não foi possível deletar arquivo temporário: ${filePath}`);
  }

  await logAction(
    tenantId,
    upload.userId,
    `UPLOAD_DONE:${uploadId} rows=${rows.length} errors=${errors.length}`,
  );

  logger.info(`[worker] insert-data concluído: ${uploadId} (${rows.length} linhas, ${errors.length} erros)`);
}

export function createUploadWorker(): Worker {
  const worker = new Worker<ProcessUploadData | InsertDataJobData>(
    'uploads',
    async (job) => {
      if (job.name === 'process-upload') {
        await handleProcessUpload(job as Job<ProcessUploadData>);
      } else if (job.name === 'insert-data') {
        await handleInsertData(job as Job<InsertDataJobData>);
      } else {
        throw new Error(`Job desconhecido: ${job.name}`);
      }
    },
    { connection: { host: env.REDIS_HOST, port: env.REDIS_PORT } },
  );

  worker.on('completed', (job) => {
    logger.info(`[worker] Job ${job.id} (${job.name}) concluído`);
  });

  worker.on('failed', (job, err) => {
    const id = job?.id ?? 'unknown';
    logger.error(`[worker] Job ${id} (${job?.name ?? '?'}) falhou: ${err.message}`);

    if (job?.data) {
      const data = job.data as Partial<ProcessUploadData>;
      if (data.uploadId) {
        prisma.rawUpload.update({
          where: { id: data.uploadId },
          data:  { status: 'ERROR', errorMessage: err.message },
        }).catch(() => {});
      }
    }
  });

  worker.on('error', (err) => {
    logger.error(`[worker] Erro geral do worker: ${err.message}`);
  });

  return worker;
}
