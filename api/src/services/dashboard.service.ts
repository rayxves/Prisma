import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

const TOP_PRODUCTS_DEFAULT_LIMIT = 50;

export interface DashboardFilters {
  tenantId:  string;
  branchId?: string;
  from?:     Date;
  to?:       Date;
}

function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: from }),
    ...(to   && { lte: to }),
  };
}

export async function getKpis({ tenantId, branchId, from, to }: DashboardFilters) {
  const dateFilter = buildDateFilter(from, to);

  const [sales, anomaliesCount] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(dateFilter && { saleDate: dateFilter }),
      },
      _sum:   { grossValue: true, totalCost: true },
      _count: { id: true },
    }),
    prisma.anomaly.count({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(dateFilter && { detectedAt: dateFilter }),
      },
    }),
  ]);

  const totalRevenue = Number(sales._sum.grossValue ?? 0);
  const totalCost    = Number(sales._sum.totalCost  ?? 0);
  const netProfit    = totalRevenue - totalCost;
  const roi          = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    netProfit,
    roi:           Number.parseFloat(roi.toFixed(2)),
    profitMargin:  Number.parseFloat(profitMargin.toFixed(2)),
    totalSales:    sales._count.id,
    anomaliesCount,
  };
}

export async function getSalesTimeline({ tenantId, branchId }: DashboardFilters) {
  const currentYear  = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const branchFilter = branchId
    ? Prisma.sql`AND branch_id = ${branchId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ year: number; month: number; total: number }[]>`
    SELECT
      EXTRACT(YEAR  FROM data_venda)::int  AS year,
      EXTRACT(MONTH FROM data_venda)::int  AS month,
      SUM(valor_bruto)::float              AS total
    FROM sales
    WHERE tenant_id = ${tenantId}
      ${branchFilter}
      AND EXTRACT(YEAR FROM data_venda) IN (${currentYear}, ${previousYear})
    GROUP BY year, month
    ORDER BY year, month
  `;

  const timeline: Record<number, { currentYear: number | null; previousYear: number | null }> = {};
  for (let m = 1; m <= 12; m++) {
    timeline[m] = { currentYear: null, previousYear: null };
  }

  rows.forEach(({ year, month, total }) => {
    if (year === currentYear)  timeline[month]!.currentYear  = total;
    if (year === previousYear) timeline[month]!.previousYear = total;
  });

  return { currentYear, previousYear, timeline };
}

export async function getTopProducts(
  { tenantId, branchId, from, to }: DashboardFilters,
  limit = TOP_PRODUCTS_DEFAULT_LIMIT,
) {
  const dateFilter = buildDateFilter(from, to);

  const products = await prisma.sale.groupBy({
    by: ['productName'],
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(dateFilter && { saleDate: dateFilter }),
    },
    _sum:     { grossValue: true, totalCost: true, quantity: true },
    orderBy:  { _sum: { grossValue: 'desc' } },
    take:     limit,
  });

  let totalProfit = 0;
  const ranked = products.map((p) => {
    const revenue   = Number(p._sum.grossValue ?? 0);
    const cost      = Number(p._sum.totalCost  ?? 0);
    const netProfit = revenue - cost;
    totalProfit    += netProfit;
    return {
      productName: p.productName,
      revenue,
      cost,
      netProfit,
      quantity: Number(p._sum.quantity ?? 0),
      isAnchor: false,
    };
  });

  let accumulated = 0;
  ranked.forEach((p) => {
    accumulated += p.netProfit;
    p.isAnchor   = totalProfit > 0 && (accumulated / totalProfit) <= 0.8;
  });

  return { totalProfit, products: ranked };
}

export async function getBranchesRanking({ tenantId, from, to }: DashboardFilters) {
  const dateFilter = buildDateFilter(from, to);

  const [salesByBranch, branches] = await Promise.all([
    prisma.sale.groupBy({
      by: ['branchId'],
      where: {
        tenantId,
        ...(dateFilter && { saleDate: dateFilter }),
      },
      _sum: { grossValue: true, totalCost: true },
    }),
    prisma.branch.findMany({
      where:  { tenantId },
      select: { id: true, name: true, city: true, state: true, monthlyGoal: true },
    }),
  ]);

  const salesMap = new Map(
    salesByBranch.map((s) => [s.branchId, s]),
  );

  return branches
    .map((branch) => {
      const s         = salesMap.get(branch.id);
      const revenue   = s ? Number(s._sum.grossValue ?? 0) : 0;
      const cost      = s ? Number(s._sum.totalCost  ?? 0) : 0;
      const netProfit = revenue - cost;
      const margin    = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const goal      = branch.monthlyGoal ? Number(branch.monthlyGoal) : 0;
      const goalAchievement = goal > 0 ? (revenue / goal) * 100 : null;

      return {
        branchId:     branch.id,
        name:         branch.name,
        city:         branch.city,
        state:        branch.state,
        revenue,
        netProfit,
        margin:          Number.parseFloat(margin.toFixed(2)),
        monthlyGoal:     goal,
        goalAchievement: goalAchievement === null ? null : Number.parseFloat(goalAchievement.toFixed(2)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getProjection({ tenantId, branchId }: DashboardFilters) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const today       = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthStart = new Date(year, month, 1);

  const branchFilter = branchId
    ? Prisma.sql`AND branch_id = ${branchId}`
    : Prisma.empty;

  const dailySales = await prisma.$queryRaw<{ day: number; total: number }[]>`
    SELECT
      EXTRACT(DAY FROM data_venda)::int AS day,
      SUM(valor_bruto)::float           AS total
    FROM sales
    WHERE tenant_id = ${tenantId}
      ${branchFilter}
      AND data_venda BETWEEN ${monthStart} AND ${now}
    GROUP BY day
    ORDER BY day
  `;

  if (dailySales.length === 0) {
    return { projectedMin: 0, projectedMax: 0, currentTotal: 0, daysElapsed: today, daysInMonth };
  }

  const n   = dailySales.length;
  const xs  = dailySales.map((d) => d.day);
  const ys  = dailySales.map((d) => d.total);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * (ys[i] ?? 0), 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  const projected    = a + b * daysInMonth;
  const projectedMin = Math.max(0, projected * 0.95);
  const projectedMax = projected * 1.05;
  const currentTotal = ys.reduce((acc, v) => acc + v, 0);

  let monthlyGoal: number | null = null;
  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    monthlyGoal  = branch ? Number(branch.monthlyGoal) : null;
  } else {
    const result = await prisma.branch.aggregate({
      where: { tenantId },
      _sum:  { monthlyGoal: true },
    });
    monthlyGoal = result._sum.monthlyGoal ? Number(result._sum.monthlyGoal) : null;
  }

  const goalAchievement =
    monthlyGoal && monthlyGoal > 0
      ? Number.parseFloat(((projected / monthlyGoal) * 100).toFixed(2))
      : null;

  return {
    currentTotal:    Number.parseFloat(currentTotal.toFixed(2)),
    projectedMin:    Number.parseFloat(projectedMin.toFixed(2)),
    projectedMax:    Number.parseFloat(projectedMax.toFixed(2)),
    daysElapsed:     today,
    daysInMonth,
    monthlyGoal,
    goalAchievement,
  };
}
