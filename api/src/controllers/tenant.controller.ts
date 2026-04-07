import { Request, Response } from 'express';
import * as TenantService from '../services/tenant.service';

export async function get(req: Request, res: Response) {
  try {
    const tenant = await TenantService.getTenant(req.user!.tenantId);
    res.json(tenant);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const tenant = await TenantService.updateTenant(req.user!.tenantId, req.body);
    res.json(tenant);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
