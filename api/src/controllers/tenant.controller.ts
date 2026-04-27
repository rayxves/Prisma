import { Request, Response, NextFunction } from 'express';

import * as TenantService from '../services/tenant.service';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await TenantService.getTenant(req.user!.tenantId);
    res.json(tenant);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await TenantService.updateTenant(req.user!.tenantId, req.user!.userId, req.body);
    res.json(tenant);
  } catch (err) { next(err); }
}
