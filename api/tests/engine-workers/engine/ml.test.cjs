const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildEncodedRow } = require("../helpers/fixtures.cjs");

const { projectFutureSales, selectFeatures, trainModel } = loadTsModule(
  "src/engine/core/ml/sales-forecasting.ts",
);

describe("engine/core/ml/sales-forecasting", () => {
  it("seleciona pelo menos 3 features e treina um modelo com dados suficientes", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      buildEncodedRow({
        dayOfWeek: index % 7,
        monthOfYear: 1 + (index % 2),
        categoriaCode: index % 3,
        valor_bruto: 100 + index * 15,
        custo_total: 50 + index * 7,
        quantidade: 1 + (index % 4),
        margem: 0.3 + index * 0.01,
      }),
    );

    const selectedFeatures = selectFeatures(rows);
    const model = trainModel(rows, selectedFeatures, 10, 0.1);

    assert.ok(selectedFeatures.length >= 3);
    assert.equal(model.featuresUsed, selectedFeatures);
    assert.equal(model.stumps.length > 0, true);
    assert.equal(typeof model.rmse, "number");
    assert.equal(typeof model.r2, "number");
  });

  it("retorna modelo baseline para poucas linhas e projeta o horizonte pedido", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      buildEncodedRow({
        valor_bruto: 80 + index * 5,
      }),
    );

    const model = trainModel(rows, ["dayOfWeek", "custo_total", "margem"]);
    const projections = projectFutureSales(model, "branch-1", 3, rows);

    assert.equal(model.stumps.length, 0);
    assert.equal(model.rmse, 0);
    assert.equal(model.r2, 0);
    assert.equal(projections.length, 3);
    assert.match(projections[0].date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof projections[0].projected, "number");
    assert.equal(typeof projections[0].lower, "number");
    assert.equal(typeof projections[0].upper, "number");
  });
});
