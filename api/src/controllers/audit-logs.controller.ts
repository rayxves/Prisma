import { Request, Response } from 'express';
import * as AuditLogsService from '../services/audit-logs.service';

export async function list(req: Request, res: Response) {
  try {
    const { userId, from, to, page, limit } = req.query as Record<string, string>;
    const logs = await AuditLogsService.listAuditLogs(req.user!.tenantId, {
      userId: userId || undefined,
      from:   from  ? new Date(from)   : undefined,
      to:     to    ? new Date(to)     : undefined,
      page:   page  ? parseInt(page)   : 1,
      limit:  limit ? parseInt(limit)  : 50,
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
