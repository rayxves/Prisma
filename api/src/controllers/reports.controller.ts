import { Request, Response, NextFunction } from 'express';

import * as ReportsService from '../services/reports.service';

function parseFilters(req: Request) {
  const { branchId, from, to } = req.query as Record<string, string | undefined>;
  return {
    tenantId: req.user!.tenantId,
    ...(branchId ? { branchId } : undefined),
    ...(from     ? { from: new Date(from) } : undefined),
    ...(to       ? { to:   new Date(to)   } : undefined),
  };
}

export async function pdf(req: Request, res: Response, next: NextFunction) {
  try {
    await ReportsService.generatePdf(parseFilters(req), res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
}

export async function excel(req: Request, res: Response, next: NextFunction) {
  try {
    await ReportsService.generateExcel(parseFilters(req), res);
  } catch (err) {
    if (!res.headersSent) next(err);
  }
}
