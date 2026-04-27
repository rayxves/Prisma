import type { DailyDiagnostic } from "../diagnostics/diagnostics-calculator";

const Z_THRESHOLD = 2.0;
const Z_CRITICAL = 3.0;

interface SeriesStats {
  average: number;
  standardDeviation: number;
}

export interface AnomalyResult {
  branchId: string;
  saleDate: Date;
  detectedAt: Date;
  deviation: number;
  hypothesis: string;
  isCritical: boolean;
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStandardDeviation(values: number[], average: number): number {
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

function calculateSeriesStats(values: number[]): SeriesStats {
  const average = calculateMean(values);

  return {
    average,
    standardDeviation: calculateStandardDeviation(values, average),
  };
}

function calculateZScore(value: number, stats: SeriesStats): number {
  return stats.standardDeviation > 0
    ? (value - stats.average) / stats.standardDeviation
    : 0;
}

function toRoundedDeviation(zScore: number): number {
  return parseFloat(zScore.toFixed(2));
}

function formatSaleDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

function createRevenueAnomaly(
  dailyMetric: DailyDiagnostic,
  detectedAt: Date,
  zScore: number,
): AnomalyResult {
  return {
    branchId: dailyMetric.branchId,
    saleDate: dailyMetric.date,
    detectedAt,
    deviation: toRoundedDeviation(zScore),
    hypothesis: buildRevenueHypothesis(zScore, dailyMetric),
    isCritical: Math.abs(zScore) > Z_CRITICAL,
  };
}

function createStockAnomaly(
  dailyMetric: DailyDiagnostic,
  detectedAt: Date,
  zScore: number,
): AnomalyResult {
  return {
    branchId: dailyMetric.branchId,
    saleDate: dailyMetric.date,
    detectedAt,
    deviation: toRoundedDeviation(zScore),
    hypothesis: buildStockHypothesis(zScore, dailyMetric),
    isCritical: zScore < -Z_CRITICAL,
  };
}

export function detectAnomalies(
  dailyMetrics: DailyDiagnostic[],
): AnomalyResult[] {
  if (dailyMetrics.length < 7) {
    return [];
  }

  const revenueStats = calculateSeriesStats(
    dailyMetrics.map((dailyMetric) => dailyMetric.totalRevenue),
  );
  const unitStats = calculateSeriesStats(
    dailyMetrics.map((dailyMetric) => dailyMetric.unitsSold),
  );
  const detectedAt = new Date();
  const anomalies: AnomalyResult[] = [];

  for (const dailyMetric of dailyMetrics) {
    const revenueZScore = calculateZScore(
      dailyMetric.totalRevenue,
      revenueStats,
    );

    if (Math.abs(revenueZScore) > Z_THRESHOLD) {
      anomalies.push(
        createRevenueAnomaly(dailyMetric, detectedAt, revenueZScore),
      );
    }

    const unitsZScore = calculateZScore(dailyMetric.unitsSold, unitStats);

    if (unitsZScore < -Z_THRESHOLD) {
      anomalies.push(createStockAnomaly(dailyMetric, detectedAt, unitsZScore));
    }
  }

  return anomalies;
}

export function countAnomaliesByDay(
  anomalies: AnomalyResult[],
): Map<string, number> {
  const anomaliesByDay = new Map<string, number>();

  for (const anomaly of anomalies) {
    const dayKey = anomaly.saleDate.toISOString().slice(0, 10);
    anomaliesByDay.set(dayKey, (anomaliesByDay.get(dayKey) ?? 0) + 1);
  }

  return anomaliesByDay;
}

function buildRevenueHypothesis(
  zScore: number,
  dailyMetric: DailyDiagnostic,
): string {
  const saleDateLabel = formatSaleDate(dailyMetric.date);
  const magnitude = Math.abs(zScore) > Z_CRITICAL ? "crítica" : "significativa";

  if (zScore < -Z_CRITICAL) {
    return `[${saleDateLabel}] Queda crítica de faturamento (z=${zScore.toFixed(2)}). Possíveis causas: fechamento imprevisto, falha de caixa, ausência de estoque ou evento externo (feriado, greve).`;
  }

  if (zScore < -Z_THRESHOLD) {
    return `[${saleDateLabel}] Queda ${magnitude} de faturamento (z=${zScore.toFixed(2)}). Verificar: baixo movimento, promoção concorrente, ou falha operacional.`;
  }

  if (zScore > Z_CRITICAL) {
    return `[${saleDateLabel}] Pico crítico de faturamento (z=${zScore.toFixed(2)}). Possíveis causas: liquidação, evento sazonal, ou entrada de grande cliente. Confirmar se dados são corretos.`;
  }

  return `[${saleDateLabel}] Pico ${magnitude} de faturamento (z=${zScore.toFixed(2)}). Avaliar se há evento especial ou possível duplicação de lançamentos.`;
}

function buildStockHypothesis(
  zScore: number,
  dailyMetric: DailyDiagnostic,
): string {
  const saleDateLabel = formatSaleDate(dailyMetric.date);
  const magnitude = zScore < -Z_CRITICAL ? "crítica" : "significativa";

  return `[${saleDateLabel}] Queda ${magnitude} no volume de unidades vendidas (z=${zScore.toFixed(2)}). Possível ruptura de estoque, produto fora de linha ou falha no ponto de venda.`;
}
