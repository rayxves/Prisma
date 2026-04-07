import { Request, Response } from 'express';
import * as MetricsService from '../services/metrics.service';

export async function daily(req: Request, res: Response) {
  try {
    const { branchId, from, to } = req.query as Record<string, string>;
    const metrics = await MetricsService.getDailyMetrics(req.user!.tenantId, {
      branchId: branchId || undefined,
      from:     from ? new Date(from) : undefined,
      to:       to   ? new Date(to)   : undefined,
    });
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
