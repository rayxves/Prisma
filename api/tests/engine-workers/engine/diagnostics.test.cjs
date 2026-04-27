const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildCleanRow } = require("../helpers/fixtures.cjs");

const { computeDiagnostics } = loadTsModule(
  "src/engine/core/diagnostics/diagnostics-calculator.ts",
);

describe("engine/core/diagnostics/diagnostics-calculator", () => {
  it("agrega métricas da filial e métricas diárias", () => {
    const rows = [
      buildCleanRow({
        external_id: "sale-1",
        data_venda: new Date("2026-01-01T10:00:00.000Z"),
        valor_bruto: 100,
        custo_total: 60,
        quantidade: 2,
      }),
      buildCleanRow({
        external_id: "sale-2",
        data_venda: new Date("2026-01-01T15:00:00.000Z"),
        valor_bruto: 200,
        custo_total: 120,
        quantidade: 3,
      }),
      buildCleanRow({
        external_id: "sale-3",
        data_venda: new Date("2026-01-02T12:00:00.000Z"),
        valor_bruto: 50,
        custo_total: 20,
        quantidade: 1,
      }),
    ];

    const diagnostics = computeDiagnostics(rows, "branch-77");

    assert.equal(diagnostics.branch.branchId, "branch-77");
    assert.equal(diagnostics.branch.totalRevenue, 350);
    assert.equal(diagnostics.branch.totalCost, 200);
    assert.equal(diagnostics.branch.netProfit, 150);
    assert.equal(diagnostics.branch.unitsSold, 6);
    assert.equal(diagnostics.branch.transactionCount, 3);
    assert.equal(diagnostics.daily.length, 2);
    assert.equal(diagnostics.daily[0].totalRevenue, 300);
    assert.equal(diagnostics.daily[0].avgTicket, 150);
    assert.equal(diagnostics.daily[1].totalRevenue, 50);
    assert.equal(diagnostics.daily[1].unitsSold, 1);
  });
});
