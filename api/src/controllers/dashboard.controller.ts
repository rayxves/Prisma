import { Request, Response, NextFunction } from 'express';

import * as DashboardService from '../services/dashboard.service';

const TOP_PRODUCTS_MAX_LIMIT = 200;

function parseFilters(req: Request) {
  const { branchId, from, to } = req.query as Record<string, string | undefined>;
  return {
    tenantId: req.user!.tenantId,
    ...(branchId ? { branchId } : undefined),
    ...(from     ? { from: new Date(from) } : undefined),
    ...(to       ? { to:   new Date(to)   } : undefined),
  };
}

export async function kpis(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await DashboardService.getKpis(parseFilters(req)));
  } catch (err) { next(err); }
}

export async function salesTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await DashboardService.getSalesTimeline(parseFilters(req)));
  } catch (err) { next(err); }
}

export async function topProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const rawLimit = Number((req.query as Record<string, string | undefined>)['limit'] ?? 50);
    const limit    = Math.min(Math.max(1, rawLimit), TOP_PRODUCTS_MAX_LIMIT);
    res.json(await DashboardService.getTopProducts(parseFilters(req), limit));
  } catch (err) { next(err); }
}

export async function branchesRanking(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await DashboardService.getBranchesRanking(parseFilters(req)));
  } catch (err) { next(err); }
}

export async function projection(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await DashboardService.getProjection(parseFilters(req)));
  } catch (err) { next(err); }
}
