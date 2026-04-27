import type { AnomalyResult } from "../../../engine/core/anomaly/anomaly-detector";
import type { AnomalyRepository } from "../../../engine/application/contracts/upload-engine.contracts";
import { prisma } from "../../../lib/prisma";

function createPersistedAnomalies(
  tenantId: string,
  anomalies: AnomalyResult[],
) {
  return anomalies.map((anomaly) => ({
    tenantId,
    branchId: anomaly.branchId,
    saleDate: anomaly.saleDate,
    detectedAt: anomaly.detectedAt,
    deviation: anomaly.deviation,
    hypothesis: anomaly.hypothesis,
    isCritical: anomaly.isCritical,
  }));
}

export function createPrismaAnomalyRepository(): AnomalyRepository {
  return {
    async saveAnomalies(
      tenantId: string,
      anomalies: AnomalyResult[],
    ): Promise<void> {
      if (anomalies.length === 0) {
        return;
      }

      await prisma.anomaly.createMany({
        data: createPersistedAnomalies(tenantId, anomalies),
        skipDuplicates: true,
      });
    },
  };
}
