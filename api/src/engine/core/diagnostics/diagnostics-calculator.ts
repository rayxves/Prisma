import type { CleanRow } from "../cleaner/data-cleaner";

interface DailyAccumulator {
  revenue: number;
  cost: number;
  units: number;
  txCount: number;
}

export interface DailyDiagnostic {
  branchId: string;
  date: Date;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number;
  margin: number;
  avgTicket: number;
  unitsSold: number;
  anomaliesCount: number;
}

export interface DiagnosticsReport {
  byBranch: Map<string, BranchDiagnostic>;
  daily: DailyDiagnostic[];
}

export interface BranchDiagnostic {
  branchId: string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number;
  margin: number;
  avgTicket: number;
  unitsSold: number;
  transactionCount: number;
}

function createDailyAccumulator(): DailyAccumulator {
  return {
    revenue: 0,
    cost: 0,
    units: 0,
    txCount: 0,
  };
}

function buildDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundValue(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function buildBranchDiagnostic(
  branchId: string,
  rows: CleanRow[],
  totalRevenue: number,
  totalCost: number,
  unitsSold: number,
): BranchDiagnostic {
  const netProfit = totalRevenue - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const avgTicket = rows.length > 0 ? totalRevenue / rows.length : 0;

  return {
    branchId,
    totalRevenue: roundValue(totalRevenue),
    totalCost: roundValue(totalCost),
    netProfit: roundValue(netProfit),
    roi: roundValue(roi, 4),
    margin: roundValue(margin, 4),
    avgTicket: roundValue(avgTicket),
    unitsSold,
    transactionCount: rows.length,
  };
}

function buildDailyDiagnostic(
  branchId: string,
  dayKey: string,
  dayData: DailyAccumulator,
): DailyDiagnostic {
  const netProfit = dayData.revenue - dayData.cost;
  const roi = dayData.cost > 0 ? (netProfit / dayData.cost) * 100 : 0;
  const margin = dayData.revenue > 0 ? (netProfit / dayData.revenue) * 100 : 0;

  return {
    branchId,
    date: new Date(dayKey),
    totalRevenue: roundValue(dayData.revenue),
    totalCost: roundValue(dayData.cost),
    netProfit: roundValue(netProfit),
    roi: roundValue(roi, 4),
    margin: roundValue(margin, 4),
    avgTicket:
      dayData.txCount > 0 ? roundValue(dayData.revenue / dayData.txCount) : 0,
    unitsSold: dayData.units,
    anomaliesCount: 0,
  };
}

export function computeDiagnostics(
  rows: CleanRow[],
  branchId: string,
): { branch: BranchDiagnostic; daily: DailyDiagnostic[] } {
  let totalRevenue = 0;
  let totalCost = 0;
  let unitsSold = 0;

  const dailyMetricsByDay = new Map<string, DailyAccumulator>();

  for (const row of rows) {
    const dayKey = buildDayKey(row.data_venda);
    const dailyAccumulator =
      dailyMetricsByDay.get(dayKey) ?? createDailyAccumulator();

    totalRevenue += row.valor_bruto;
    totalCost += row.custo_total;
    unitsSold += row.quantidade;

    dailyAccumulator.revenue += row.valor_bruto;
    dailyAccumulator.cost += row.custo_total;
    dailyAccumulator.units += row.quantidade;
    dailyAccumulator.txCount += 1;

    dailyMetricsByDay.set(dayKey, dailyAccumulator);
  }

  const branch = buildBranchDiagnostic(
    branchId,
    rows,
    totalRevenue,
    totalCost,
    unitsSold,
  );
  const daily = Array.from(dailyMetricsByDay, ([dayKey, dayData]) =>
    buildDailyDiagnostic(branchId, dayKey, dayData),
  );

  return { branch, daily };
}
