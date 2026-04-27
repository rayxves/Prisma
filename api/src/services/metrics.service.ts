import { prisma } from '../lib/prisma';

export async function getDailyMetrics(
  tenantId: string,
  filters: { branchId?: string; from?: Date; to?: Date }
) {
  const { branchId, from, to } = filters;

  return prisma.dailyMetrics.findMany({
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: from }),
              ...(to   && { lte: to }),
            },
          }
        : {}),
    },
    select: {
      id:             true,
      date:           true,
      totalSales:     true,
      roiDay:         true,
      marginDay:      true,
      anomaliesCount: true,
      branchId:       true,
      branch: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });
}
