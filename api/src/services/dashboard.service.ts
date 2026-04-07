import { prisma } from '../lib/prisma';

interface DashboardFilters {
  tenantId: string;
  branchId?: string;
  from?: Date;
  to?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: from }),
    ...(to   && { lte: to }),
  };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
// Faturamento total, ROI médio, Margem de Lucro e quantidade de anomalias
export async function getKpis({ tenantId, branchId, from, to }: DashboardFilters) {
  const dateFilter = buildDateFilter(from, to);

  const [sales, anomaliesCount] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(dateFilter && { saleDate: dateFilter }),
      },
      _sum: { grossValue: true, totalCost: true },
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

  const totalRevenue  = Number(sales._sum.grossValue ?? 0);
  const totalCost     = Number(sales._sum.totalCost  ?? 0);
  const netProfit     = totalRevenue - totalCost;
  const roi           = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const profitMargin  = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    netProfit,
    roi:          parseFloat(roi.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    totalSales:   sales._count.id,
    anomaliesCount,
  };
}

// ─── Sales Timeline ───────────────────────────────────────────────────────────
// Série temporal: mês a mês do ano atual vs. ano anterior
export async function getSalesTimeline({ tenantId, branchId }: DashboardFilters) {
  const currentYear  = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const rows = await prisma.$queryRaw<
    { year: number; month: number; total: number }[]
  >`
    SELECT
      EXTRACT(YEAR  FROM sale_date)::int  AS year,
      EXTRACT(MONTH FROM sale_date)::int  AS month,
      SUM(gross_value)::float             AS total
    FROM sales
    WHERE tenant_id = ${tenantId}
      ${branchId ? prisma.$raw`AND branch_id = ${branchId}` : prisma.$raw``}
      AND EXTRACT(YEAR FROM sale_date) IN (${currentYear}, ${previousYear})
    GROUP BY year, month
    ORDER BY year, month
  `;

  // Reorganiza em dois arrays indexados por mês (1–12) para facilitar o gráfico
  const timeline: Record<number, { currentYear: number | null; previousYear: number | null }> = {};
  for (let m = 1; m <= 12; m++) {
    timeline[m] = { currentYear: null, previousYear: null };
  }

  rows.forEach(({ year, month, total }) => {
    if (year === currentYear)  timeline[month].currentYear  = total;
    if (year === previousYear) timeline[month].previousYear = total;
  });

  return { currentYear, previousYear, timeline };
}

// ─── Top Products (Pareto 80/20) ──────────────────────────────────────────────
// Ranking de produtos por lucro líquido com marcação de "produto âncora"
export async function getTopProducts({ tenantId, branchId, from, to }: DashboardFilters) {
  const dateFilter = buildDateFilter(from, to);

  const products = await prisma.sale.groupBy({
    by: ['productName'],
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(dateFilter && { saleDate: dateFilter }),
    },
    _sum: { grossValue: true, totalCost: true, quantity: true },
    orderBy: { _sum: { grossValue: 'desc' } },
  });

  let totalProfit = 0;
  const ranked = products.map((p) => {
    const revenue    = Number(p._sum.grossValue ?? 0);
    const cost       = Number(p._sum.totalCost  ?? 0);
    const netProfit  = revenue - cost;
    totalProfit     += netProfit;
    return {
      productName: p.productName,
      revenue,
      cost,
      netProfit,
      quantity: Number(p._sum.quantity ?? 0),
      isAnchor: false, // será calculado abaixo
    };
  });

  // Marca os produtos que acumulam 80% do lucro total (Pareto)
  let accumulated = 0;
  ranked.forEach((p) => {
    accumulated      += p.netProfit;
    p.isAnchor        = totalProfit > 0 && (accumulated / totalProfit) <= 0.8;
  });

  return { totalProfit, products: ranked };
}

// ─── Branches Ranking ─────────────────────────────────────────────────────────
// Comparativo de filiais por faturamento, margem e atingimento de meta
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
      where: { tenantId },
      select: { id: true, name: true, city: true, state: true, monthlyGoal: true },
    }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const ranking = salesByBranch
    .map((s) => {
      const branch    = branchMap.get(s.branchId);
      const revenue   = Number(s._sum.grossValue ?? 0);
      const cost      = Number(s._sum.totalCost  ?? 0);
      const netProfit = revenue - cost;
      const margin    = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const goal      = branch?.monthlyGoal ? Number(branch.monthlyGoal) : 0;
      const goalAchievement = goal > 0 ? (revenue / goal) * 100 : null;

      return {
        branchId:     s.branchId,
        name:         branch?.name    ?? 'Filial desconhecida',
        city:         branch?.city    ?? '',
        state:        branch?.state   ?? '',
        revenue,
        netProfit,
        margin:       parseFloat(margin.toFixed(2)),
        monthlyGoal:  goal,
        goalAchievement: goalAchievement !== null ? parseFloat(goalAchievement.toFixed(2)) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return ranking;
}

// ─── Revenue Projection ───────────────────────────────────────────────────────
// Regressão linear simples: projeta faturamento até o final do mês corrente
export async function getProjection({ tenantId, branchId }: DashboardFilters) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth(); // 0-indexed
  const today       = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month, daysInMonth, 23, 59, 59);

  // Vendas dos dias já transcorridos no mês corrente
  const dailySales = await prisma.$queryRaw<{ day: number; total: number }[]>`
    SELECT
      EXTRACT(DAY FROM sale_date)::int AS day,
      SUM(gross_value)::float          AS total
    FROM sales
    WHERE tenant_id     = ${tenantId}
      ${branchId ? prisma.$raw`AND branch_id = ${branchId}` : prisma.$raw``}
      AND sale_date BETWEEN ${monthStart} AND ${now}
    GROUP BY day
    ORDER BY day
  `;

  if (dailySales.length === 0) {
    return { projectedMin: 0, projectedMax: 0, currentTotal: 0, daysElapsed: today, daysInMonth };
  }

  // Regressão linear simples: y = a + b*x (x = dia, y = venda acumulada)
  const n  = dailySales.length;
  const xs = dailySales.map((d) => d.day);
  const ys = dailySales.map((d) => d.total);

  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  // Projeção para o último dia do mês com margem de ±5%
  const projected     = a + b * daysInMonth;
  const projectedMin  = Math.max(0, projected * 0.95);
  const projectedMax  = projected * 1.05;
  const currentTotal  = ys.reduce((acc, v) => acc + v, 0);

  // Busca meta da filial (ou soma das metas de todas as filiais)
  let monthlyGoal: number | null = null;
  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    monthlyGoal  = branch ? Number(branch.monthlyGoal) : null;
  } else {
    const result = await prisma.branch.aggregate({
      where: { tenantId },
      _sum: { monthlyGoal: true },
    });
    monthlyGoal = result._sum.monthlyGoal ? Number(result._sum.monthlyGoal) : null;
  }

  const goalAchievement =
    monthlyGoal && monthlyGoal > 0
      ? parseFloat(((projected / monthlyGoal) * 100).toFixed(2))
      : null;

  return {
    currentTotal:    parseFloat(currentTotal.toFixed(2)),
    projectedMin:    parseFloat(projectedMin.toFixed(2)),
    projectedMax:    parseFloat(projectedMax.toFixed(2)),
    daysElapsed:     today,
    daysInMonth,
    monthlyGoal,
    goalAchievement, // ex: 94.2 → "no ritmo atual você atingirá 94% da meta"
  };
}
