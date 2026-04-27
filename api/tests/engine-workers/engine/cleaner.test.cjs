const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildRawRow } = require("../helpers/fixtures.cjs");

const { cleanRows, encodeForML } = loadTsModule(
  "src/engine/core/cleaner/data-cleaner.ts",
);

describe("engine/core/cleaner/data-cleaner", () => {
  it("limpa linhas válidas, imputa valores faltantes e descarta linhas inválidas", () => {
    const rawRows = [
      buildRawRow({
        external_id: "sale-100",
        custo_total: "",
        quantidade: "",
      }),
      buildRawRow({
        external_id: "sale-101",
        valor_bruto: "110",
        custo_total: "70",
        quantidade: "2",
      }),
      buildRawRow({
        external_id: "sale-102",
        valor_bruto: "90",
        custo_total: "55",
        quantidade: "3",
      }),
      buildRawRow({
        external_id: "sale-200",
        produto_nome: "",
      }),
    ];

    const result = cleanRows(rawRows, {});

    assert.equal(result.rows.length, 3);
    assert.equal(result.discarded, 1);
    assert.equal(result.imputedNulls, 2);
    assert.equal(result.outliersCapped, 0);
    assert.match(result.warnings[0], /descartada/i);
    assert.equal(result.rows[0].external_id, "sale-100");
    assert.equal(result.rows[0].categoria, "bebidas");
    assert.equal(result.rows[0].produto_nome, "cafe premium");
    assert.equal(result.rows[0].custo_total, 70);
    assert.equal(result.rows[0].quantidade, 1);
  });

  it("capa outliers numéricos e gera encoding para ML", () => {
    const rawRows = [
      buildRawRow({
        external_id: "sale-1",
        valor_bruto: "10",
        custo_total: "5",
      }),
      buildRawRow({
        external_id: "sale-6",
        valor_bruto: "10",
        custo_total: "5",
      }),
      buildRawRow({
        external_id: "sale-2",
        valor_bruto: "11",
        custo_total: "5",
      }),
      buildRawRow({
        external_id: "sale-3",
        valor_bruto: "12",
        custo_total: "6",
      }),
      buildRawRow({
        external_id: "sale-7",
        valor_bruto: "12",
        custo_total: "6",
      }),
      buildRawRow({
        external_id: "sale-4",
        valor_bruto: "13",
        custo_total: "6",
      }),
      buildRawRow({
        external_id: "sale-8",
        valor_bruto: "13",
        custo_total: "6",
      }),
      buildRawRow({
        external_id: "sale-5",
        valor_bruto: "1000",
        custo_total: "500",
        categoria: "Mercearia",
      }),
    ];

    const cleanResult = cleanRows(rawRows, {});
    const { encoded, categoriaMap } = encodeForML(cleanResult.rows);

    assert.ok(cleanResult.outliersCapped > 0);
    assert.ok(
      Math.max(...cleanResult.rows.map((row) => row.valor_bruto)) < 1000,
    );
    assert.equal(encoded.length, 8);
    assert.equal(categoriaMap.get("bebidas"), 0);
    assert.equal(categoriaMap.get("mercearia"), 1);
    assert.equal(encoded[0].margem, 0.5);
  });
  it("respeita o mapping informado e gera defaults consistentes", () => {
    const rawRows = [
      {
        Codigo: "",
        "Data Venda": "12/02/2026",
        "Valor Bruto": "R$ 1.234,56",
        "Custo Total": "1.300,00",
        Produto: "  Cha Mate  ",
        Qtd: "0",
      },
      {
        Codigo: "sale-2",
        "Data Venda": "13/02/2026",
        "Valor Bruto": "1200,00",
        "Custo Total": "800,00",
        Produto: "Suco Verde",
        Qtd: "2",
      },
      {
        Codigo: "sale-3",
        "Data Venda": "14/02/2026",
        "Valor Bruto": "1180,00",
        "Custo Total": "780,00",
        Produto: "Agua com gas",
        Qtd: "3",
      },
    ];

    const result = cleanRows(rawRows, {
      external_id: "Codigo",
      data_venda: "Data Venda",
      valor_bruto: "Valor Bruto",
      custo_total: "Custo Total",
      produto_nome: "Produto",
      quantidade: "Qtd",
    });

    assert.equal(result.rows.length, 3);
    assert.equal(result.discarded, 0);
    assert.equal(result.rows[0].external_id, "auto-1");
    assert.equal(
      result.rows[0].data_venda.toISOString(),
      "2026-02-12T03:00:00.000Z",
    );
    assert.equal(result.rows[0].valor_bruto, 1234.56);
    assert.equal(result.rows[0].custo_total, 1111.104);
    assert.equal(result.rows[0].quantidade, 1);
    assert.equal(result.rows[0].categoria, "sem_categoria");
    assert.equal(result.rows[0].produto_nome, "cha mate");
    assert.equal(result.imputedNulls, 2);
  });
});
