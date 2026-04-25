import { Request, Response, NextFunction } from 'express';

import * as AnomaliesService from '../services/anomalies.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { branchId, from, to } = req.query as Record<string, string | undefined>;
    const anomalies = await AnomaliesService.listAnomalies(req.user!.tenantId, {
      ...(branchId ? { branchId } : undefined),
      ...(from ? { from: new Date(from) } : undefined),
      ...(to   ? { to:   new Date(to)   } : undefined),
    });
    res.json(anomalies);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const anomaly = await AnomaliesService.getAnomalyById(req.user!.tenantId, req.params['id'] as string);
    res.json(anomaly);
  } catch (err) { next(err); }
}
