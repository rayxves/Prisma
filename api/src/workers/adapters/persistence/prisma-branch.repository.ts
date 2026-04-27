import type { BranchRepository } from "../../../engine/application/contracts/upload-engine.contracts";
import { prisma } from "../../../lib/prisma";

export function createPrismaBranchRepository(): BranchRepository {
  return {
    async findOrCreateDefaultBranchId(tenantId: string): Promise<string> {
      const existingBranch = await prisma.branch.findFirst({
        where: { tenantId },
      });

      if (existingBranch) {
        return existingBranch.id;
      }

      const createdBranch = await prisma.branch.create({
        data: {
          tenantId,
          name: "Matriz",
          city: "Não informada",
          state: "GO",
          monthlyGoal: 50000,
        },
      });

      return createdBranch.id;
    },
  };
}
