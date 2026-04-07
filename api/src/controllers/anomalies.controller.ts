import { Request, Response } from 'express';
import * as AnomaliesService from '../services/anomalies.service';

export async function list(req: Request, res: Response) {
  try {
    const { branchId, from, to } = req.query as Record<string, string>;
    const anomalies = await AnomaliesService.listAnomalies(req.user!.tenantId, {
      branchId: branchId || undefined,
      from:     from ? new Date(from) : undefined,
      to:       to   ? new Date(to)   : undefined,
    });
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const anomaly = await AnomaliesService.getAnomalyById(req.user!.tenantId, req.params.id);
    res.json(anomaly);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}
