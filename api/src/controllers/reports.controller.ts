import { Request, Response } from 'express';
import * as ReportsService from '../services/reports.service';

function parseFilters(req: Request) {
  const { branchId, from, to } = req.query as Record<string, string>;
  return {
    tenantId: req.user!.tenantId,
    branchId: branchId || undefined,
    from:     from ? new Date(from) : undefined,
    to:       to   ? new Date(to)   : undefined,
  };
}

export async function pdf(req: Request, res: Response) {
  try {
    await ReportsService.generatePdf(parseFilters(req), res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

export async function excel(req: Request, res: Response) {
  try {
    await ReportsService.generateExcel(parseFilters(req), res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}
