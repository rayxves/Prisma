import { prisma } from '../lib/prisma';

// ─── List Audit Logs ──────────────────────────────────────────────────────────
// Retorna ações registradas do tenant com paginação
export async function listAuditLogs(
  tenantId: string,
  filters: { userId?: string; from?: Date; to?: Date; page?: number; limit?: number }
) {
  const { userId, from, to, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(userId && { userId }),
        ...(from || to
          ? {
              timestamp: {
                ...(from && { gte: from }),
                ...(to   && { lte: to }),
              },
            }
          : {}),
      },
      select: {
        id:        true,
        action:    true,
        timestamp: true,
        userId:    true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({
      where: {
        tenantId,
        ...(userId && { userId }),
      },
    }),
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Helper: registrar ação (chamado internamente pelos outros services) ───────
export async function logAction(tenantId: string, userId: string, action: string) {
  return prisma.auditLog.create({
    data: { tenantId, userId, action },
  });
}
