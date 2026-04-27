import type { CleanRow } from "../../../engine/core/cleaner/data-cleaner";
import type { SalesRepository } from "../../../engine/application/contracts/upload-engine.contracts";
import { prisma } from "../../../lib/prisma";

function createSalesPayload(
  tenantId: string,
  branchId: string,
  rows: CleanRow[],
) {
  return rows.map((row) => ({
    tenantId,
    branchId,
    externalId: row.external_id,
    saleDate: row.data_venda,
    grossValue: row.valor_bruto,
    totalCost: row.custo_total,
    category: row.categoria,
    productName: row.produto_nome,
    quantity: row.quantidade,
  }));
}

export function createPrismaSalesRepository(): SalesRepository {
  return {
    async saveSales(
      tenantId: string,
      branchId: string,
      rows: CleanRow[],
    ): Promise<void> {
      await prisma.sale.createMany({
        data: createSalesPayload(tenantId, branchId, rows),
        skipDuplicates: true,
      });
    },
  };
}
