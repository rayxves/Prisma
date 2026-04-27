const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildDailyDiagnostic } = require("../helpers/fixtures.cjs");

const { countAnomaliesByDay, detectAnomalies } = loadTsModule(
  "src/engine/core/anomaly/anomaly-detector.ts",
);

describe("engine/core/anomaly/anomaly-detector", () => {
  it("não detecta anomalias quando há menos de 7 dias", () => {
    const dailyMetrics = Array.from({ length: 6 }, (_, index) =>
      buildDailyDiagnostic({
        date: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      }),
    );

    const anomalies = detectAnomalies(dailyMetrics);

    assert.deepEqual(anomalies, []);
  });

  it("detecta pico de faturamento e queda anormal de unidades", () => {
    const dailyMetrics = Array.from({ length: 7 }, (_, index) =>
      buildDailyDiagnostic({
        date: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
        totalRevenue: index === 6 ? 500 : 100,
        totalCost: index === 6 ? 250 : 60,
        unitsSold: index === 6 ? 1 : 10,
        avgTicket: index === 6 ? 500 : 100,
      }),
    );

    const anomalies = detectAnomalies(dailyMetrics);
    const countsByDay = countAnomaliesByDay(anomalies);

    assert.ok(anomalies.length >= 2);
    assert.ok(
      anomalies.some((anomaly) => /faturamento/i.test(anomaly.hypothesis)),
    );
    assert.ok(anomalies.some((anomaly) => /volume/i.test(anomaly.hypothesis)));
    assert.equal(countsByDay.get("2026-01-07"), anomalies.length);
  });
  it("marca anomalias criticas quando o desvio ultrapassa o limite severo", () => {
    const dailyMetrics = Array.from({ length: 11 }, (_, index) =>
      buildDailyDiagnostic({
        date: new Date(
          `2026-02-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        ),
        totalRevenue: index === 10 ? 1000 : 100,
        totalCost: index === 10 ? 400 : 60,
        unitsSold: index === 10 ? 0 : 10,
        avgTicket: index === 10 ? 1000 : 100,
      }),
    );

    const anomalies = detectAnomalies(dailyMetrics);
    const criticalRevenue = anomalies.find(
      (anomaly) =>
        anomaly.saleDate.toISOString() === "2026-02-11T00:00:00.000Z" &&
        /faturamento/i.test(anomaly.hypothesis),
    );
    const criticalUnits = anomalies.find(
      (anomaly) =>
        anomaly.saleDate.toISOString() === "2026-02-11T00:00:00.000Z" &&
        /volume/i.test(anomaly.hypothesis),
    );

    assert.ok(criticalRevenue);
    assert.equal(criticalRevenue.isCritical, true);
    assert.ok(criticalRevenue.deviation > 3);
    assert.ok(criticalUnits);
    assert.equal(criticalUnits.isCritical, true);
    assert.ok(criticalUnits.deviation < -3);
  });
});
