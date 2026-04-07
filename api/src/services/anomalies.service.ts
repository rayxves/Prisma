import { prisma } from '../lib/prisma';

export async function listAnomalies(
  tenantId: string,
  filters: { branchId?: string; from?: Date; to?: Date }
) {
  const { branchId, from, to } = filters;

  return prisma.anomaly.findMany({
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(from || to
        ? {
            detectedAt: {
              ...(from && { gte: from }),
              ...(to   && { lte: to }),
            },
          }
        : {}),
    },
    select: {
      id:          true,
      branchId:    true,
      detectedAt:  true,
      saleDate:    true,
      hypothesis:  true,
      deviation:   true,
      branch: { select: { name: true, city: true, state: true } },
    },
    orderBy: { detectedAt: 'desc' },
  });
}

export async function getAnomalyById(tenantId: string, id: string) {
  const anomaly = await prisma.anomaly.findFirst({
    where: { id, tenantId },
    include: {
      branch: { select: { name: true, city: true, state: true, monthlyGoal: true } },
    },
  });
  if (!anomaly) throw new Error('Anomalia não encontrada');

  const saleDate   = anomaly.saleDate;
  const dayStart   = new Date(saleDate);
  const dayEnd     = new Date(saleDate);
  dayEnd.setHours(23, 59, 59, 999);

  const daySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      branchId: anomaly.branchId,
      saleDate: { gte: dayStart, lte: dayEnd },
    },
    _sum: { grossValue: true, totalCost: true },
  });

  const revenue   = Number(daySales._sum.grossValue ?? 0);
  const cost      = Number(daySales._sum.totalCost  ?? 0);
  const roi       = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

  return {
    ...anomaly,
    crossedRoi: parseFloat(roi.toFixed(2)),
  };
}
