import { Request, Response, NextFunction } from 'express';

import * as MetricsService from '../services/metrics.service';

export async function daily(req: Request, res: Response, next: NextFunction) {
  try {
    const { branchId, from, to } = req.query as Record<string, string | undefined>;
    const metrics = await MetricsService.getDailyMetrics(req.user!.tenantId, {
      ...(branchId ? { branchId } : undefined),
      ...(from ? { from: new Date(from) } : undefined),
      ...(to   ? { to:   new Date(to)   } : undefined),
    });
    res.json(metrics);
  } catch (err) { next(err); }
}
