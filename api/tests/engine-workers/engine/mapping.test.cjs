const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");

const { buildSuggestedMapping } = loadTsModule(
  "src/engine/core/mapping/suggested-mapping-builder.ts",
);

describe("engine/core/mapping/suggested-mapping-builder", () => {
  it("sugere o mapeamento esperado para cabeçalhos comuns", () => {
    const mapping = buildSuggestedMapping([
      "Data Venda",
      "Valor Bruto",
      "Custo Total",
      "Produto",
      "Qtd",
      "Codigo",
    ]);

    assert.equal(mapping.data_venda, "Data Venda");
    assert.equal(mapping.valor_bruto, "Valor Bruto");
    assert.equal(mapping.custo_total, "Custo Total");
    assert.equal(mapping.produto_nome, "Produto");
    assert.equal(mapping.quantidade, "Qtd");
    assert.equal(mapping.external_id, "Codigo");
    assert.equal(mapping.categoria, null);
  });
  it("encontra correspondencias com variacoes de escrita e separadores", () => {
    const mapping = buildSuggestedMapping([
      "Dt-Venda",
      "Receita Total",
      "COGS",
      "Nome Produto",
      "Qtde",
      "Sale-ID",
    ]);

    assert.equal(mapping.data_venda, "Dt-Venda");
    assert.equal(mapping.valor_bruto, "Receita Total");
    assert.equal(mapping.custo_total, "COGS");
    assert.equal(mapping.produto_nome, "Nome Produto");
    assert.equal(mapping.quantidade, "Qtde");
    assert.equal(mapping.external_id, "Sale-ID");
  });
});
