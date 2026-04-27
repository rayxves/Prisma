function buildRawRow(overrides = {}) {
  return {
    external_id: "sale-1",
    data_venda: "2026-01-01",
    valor_bruto: "100",
    custo_total: "60",
    categoria: "Bebidas",
    produto_nome: "Cafe Premium",
    quantidade: "2",
    ...overrides,
  };
}

function buildCleanRow(overrides = {}) {
  return {
    external_id: "sale-1",
    data_venda: new Date("2026-01-01T12:00:00.000Z"),
    valor_bruto: 100,
    custo_total: 60,
    categoria: "bebidas",
    produto_nome: "cafe premium",
    quantidade: 2,
    ...overrides,
  };
}

function buildDailyDiagnostic(overrides = {}) {
  return {
    branchId: "branch-1",
    date: new Date("2026-01-01T00:00:00.000Z"),
    totalRevenue: 100,
    totalCost: 60,
    netProfit: 40,
    roi: 66.6667,
    margin: 40,
    avgTicket: 100,
    unitsSold: 10,
    anomaliesCount: 0,
    ...overrides,
  };
}

function buildEncodedRow(overrides = {}) {
  return {
    dayOfWeek: 1,
    monthOfYear: 1,
    categoriaCode: 0,
    valor_bruto: 100,
    custo_total: 60,
    quantidade: 2,
    margem: 0.4,
    ...overrides,
  };
}

function buildUploadRecord(overrides = {}) {
  return {
    id: "upload-1",
    filename: "sales.csv",
    tenantId: "tenant-1",
    ...overrides,
  };
}

module.exports = {
  buildCleanRow,
  buildDailyDiagnostic,
  buildEncodedRow,
  buildRawRow,
  buildUploadRecord,
};
