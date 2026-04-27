import type { DailyDiagnostic } from "../../../engine/core/diagnostics/diagnostics-calculator";
import type { DailyMetricsRepository } from "../../../engine/application/contracts/upload-engine.contracts";
import { prisma } from "../../../lib/prisma";

function buildDailyMetricsUpsert(tenantId: string, metric: DailyDiagnostic) {
  return {
    where: { date_branchId: { date: metric.date, branchId: metric.branchId } },
    create: {
      tenantId,
      branchId: metric.branchId,
      date: metric.date,
      totalSales: metric.totalRevenue,
      roiDay: metric.roi,
      marginDay: metric.margin,
      anomaliesCount: metric.anomaliesCount,
    },
    update: {
      totalSales: metric.totalRevenue,
      roiDay: metric.roi,
      marginDay: metric.margin,
      anomaliesCount: metric.anomaliesCount,
    },
  };
}

export function createPrismaDailyMetricsRepository(): DailyMetricsRepository {
  return {
    async saveDailyMetrics(
      tenantId: string,
      metrics: DailyDiagnostic[],
    ): Promise<void> {
      await Promise.all(
        metrics.map((metric) =>
          prisma.dailyMetrics.upsert(buildDailyMetricsUpsert(tenantId, metric)),
        ),
      );
    },
  };
}
