import { prisma } from '../lib/prisma';
import { NotFoundError } from '../shared/errors/app-error';

function inferKind(hypothesis: string | null): string {
  if (hypothesis?.toLowerCase().includes('unidades')) return 'Volume';
  return 'Faturamento';
}

export async function listAnomalies(
  tenantId: string,
  filters: { branchId?: string; from?: Date; to?: Date }
) {
  const { branchId, from, to } = filters;

  const rows = await prisma.anomaly.findMany({
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(from || to
        ? {
            saleDate: {
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
      isCritical:  true,
      branch: { select: { name: true, city: true, state: true } },
    },
    orderBy: { saleDate: 'desc' },
  });

  return rows.map(({ saleDate, ...rest }) => ({
    ...rest,
    date: saleDate,
    kind: inferKind(rest.hypothesis),
  }));
}

export async function getAnomalyById(tenantId: string, id: string) {
  const anomaly = await prisma.anomaly.findFirst({
    where: { id, tenantId },
    include: {
      branch: { select: { name: true, city: true, state: true, monthlyGoal: true } },
    },
  });
  if (!anomaly) throw new NotFoundError('Anomalia não encontrada');

  const saleDate = anomaly.saleDate;
  const dayStart = new Date(saleDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(saleDate);
  dayEnd.setHours(23, 59, 59, 999);

  const daySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      branchId: anomaly.branchId,
      saleDate: { gte: dayStart, lte: dayEnd },
    },
    _sum: { grossValue: true, totalCost: true },
  });

  const revenue = Number(daySales._sum.grossValue ?? 0);
  const cost    = Number(daySales._sum.totalCost  ?? 0);
  const roi     = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

  const { saleDate: _sd, ...rest } = anomaly;
  return {
    ...rest,
    date:       saleDate,
    kind:       inferKind(anomaly.hypothesis),
    crossedRoi: Number.parseFloat(roi.toFixed(2)),
  };
}
