import { Request, Response } from 'express';
import * as DashboardService from '../services/dashboard.service';

function parseFilters(req: Request) {
  const { branchId, from, to } = req.query as Record<string, string>;
  return {
    tenantId: req.user!.tenantId,
    branchId: branchId || undefined,
    from:     from ? new Date(from) : undefined,
    to:       to   ? new Date(to)   : undefined,
  };
}

export async function kpis(req: Request, res: Response) {
  try {
    const result = await DashboardService.getKpis(parseFilters(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function salesTimeline(req: Request, res: Response) {
  try {
    const result = await DashboardService.getSalesTimeline(parseFilters(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function topProducts(req: Request, res: Response) {
  try {
    const result = await DashboardService.getTopProducts(parseFilters(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function branchesRanking(req: Request, res: Response) {
  try {
    const result = await DashboardService.getBranchesRanking(parseFilters(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function projection(req: Request, res: Response) {
  try {
    const result = await DashboardService.getProjection(parseFilters(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
