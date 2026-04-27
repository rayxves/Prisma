import { Request, Response, NextFunction } from 'express';

import * as AuditLogsService from '../services/audit-logs.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, from, to, page, limit } = req.query as Record<string, string | undefined>;
    const logs = await AuditLogsService.listAuditLogs(req.user!.tenantId, {
      ...(userId ? { userId } : undefined),
      ...(from   ? { from:  new Date(from) }  : undefined),
      ...(to     ? { to:    new Date(to) }    : undefined),
      page:  page  ? Number.parseInt(page)  : 1,
      limit: limit ? Number.parseInt(limit) : 50,
    });
    res.json(logs);
  } catch (err) { next(err); }
}
