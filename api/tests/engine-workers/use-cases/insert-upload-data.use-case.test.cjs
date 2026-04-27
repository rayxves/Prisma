const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildUploadRecord } = require("../helpers/fixtures.cjs");

const { createInsertUploadDataUseCase } = loadTsModule(
  "src/engine/application/use-cases/insert-upload-data.use-case.ts",
);

function buildParsedUploadRow(index, overrides = {}) {
  return {
    external_id: `sale-${index + 1}`,
    data_venda: `2026-01-${String(index + 1).padStart(2, "0")}`,
    valor_bruto: String(index === 7 ? 900 : 100 + index * 10),
    custo_total: String(index === 7 ? 400 : 60 + index * 5),
    categoria: "Bebidas",
    produto_nome: `Produto ${index + 1}`,
    quantidade: String(index === 7 ? 1 : 10),
    ...overrides,
  };
}

function createInsertUseCaseDependencies(parsedRows) {
  const calls = {
    statuses: [],
    branchQueries: [],
    sales: [],
    anomalies: [],
    dailyMetrics: [],
    modelMetadata: [],
  };

  const dependencies = {
    uploadRepository: {
      async updateStatus(uploadId, status) {
        calls.statuses.push({ uploadId, status });
      },
      async findByIdAndTenant() {
        return buildUploadRecord();
      },
      async saveSuggestedMapping() {
        throw new Error("saveSuggestedMapping não deve ser chamado aqui");
      },
      async saveModelMetadata(uploadId, mapping, model, projections) {
        calls.modelMetadata.push({ uploadId, mapping, model, projections });
      },
    },
    uploadFileGateway: {
      async readUpload() {
        return {
          filePath: "/tmp/sales.csv",
          rows: parsedRows,
          columns: Object.keys(parsedRows[0] ?? {}),
        };
      },
    },
    branchRepository: {
      async findOrCreateDefaultBranchId(tenantId) {
        calls.branchQueries.push(tenantId);
        return "branch-default";
      },
    },
    salesRepository: {
      async saveSales(tenantId, branchId, rows) {
        calls.sales.push({ tenantId, branchId, rows });
      },
    },
    anomalyRepository: {
      async saveAnomalies(tenantId, anomalies) {
        calls.anomalies.push({ tenantId, anomalies });
      },
    },
    dailyMetricsRepository: {
      async saveDailyMetrics(tenantId, metrics) {
        calls.dailyMetrics.push({ tenantId, metrics });
      },
    },
  };

  return { calls, dependencies };
}

function createRuntimeRecorders() {
  const progressUpdates = [];
  const events = [];

  return {
    progressUpdates,
    events,
    runtime: {
      progressReporter: {
        async update(progress) {
          progressUpdates.push(progress);
        },
      },
      observer: {
        async onRowsCleaned(event) {
          events.push({ type: "rowsCleaned", event });
        },
        async onDiagnosticsComputed(event) {
          events.push({ type: "diagnosticsComputed", event });
        },
        async onModelTrained(event) {
          events.push({ type: "modelTrained", event });
        },
        async onModelTrainingSkipped(event) {
          events.push({ type: "modelTrainingSkipped", event });
        },
      },
    },
  };
}

describe("engine/application/use-cases/insert-upload-data.use-case", () => {
  it("processa upload válido, persiste métricas e encerra com DONE", async () => {
    const parsedRows = Array.from({ length: 8 }, (_, index) =>
      buildParsedUploadRow(index),
    );
    const { calls, dependencies } = createInsertUseCaseDependencies(parsedRows);
    const { events, progressUpdates, runtime } = createRuntimeRecorders();
    const insertUploadData = createInsertUploadDataUseCase(dependencies);

    const result = await insertUploadData(
      {
        uploadId: "upload-1",
        tenantId: "tenant-1",
        mapping: {},
      },
      runtime,
    );

    assert.equal(result.filePath, "/tmp/sales.csv");
    assert.ok(result.anomalyCount > 0);
    assert.deepEqual(progressUpdates, [10, 25, 50, 65, 80, 95]);
    assert.deepEqual(calls.branchQueries, ["tenant-1"]);
    assert.equal(calls.sales.length, 1);
    assert.equal(calls.sales[0].branchId, "branch-default");
    assert.equal(calls.sales[0].rows.length, 8);
    assert.equal(calls.anomalies.length, 1);
    assert.ok(calls.anomalies[0].anomalies.length > 0);
    assert.equal(calls.dailyMetrics.length, 1);
    assert.equal(calls.dailyMetrics[0].metrics.length, 8);
    assert.ok(
      calls.dailyMetrics[0].metrics.some((metric) => metric.anomaliesCount > 0),
    );
    assert.deepEqual(calls.statuses, [
      { uploadId: "upload-1", status: "DONE" },
    ]);
    assert.equal(calls.modelMetadata.length, 0);
    assert.ok(events.some(({ type }) => type === "rowsCleaned"));
    assert.ok(events.some(({ type }) => type === "diagnosticsComputed"));
    assert.ok(events.some(({ type }) => type === "modelTrainingSkipped"));
  });

  it("salva metadata do modelo quando há dados suficientes para treino", async () => {
    const parsedRows = Array.from({ length: 30 }, (_, index) =>
      buildParsedUploadRow(index, {
        data_venda: `2026-02-${String(index + 1).padStart(2, "0")}`,
        valor_bruto: String(100 + index * 12),
        custo_total: String(50 + index * 7),
        quantidade: String(1 + (index % 5)),
      }),
    );
    const { calls, dependencies } = createInsertUseCaseDependencies(parsedRows);
    const { events, runtime } = createRuntimeRecorders();
    const insertUploadData = createInsertUploadDataUseCase(dependencies);

    await insertUploadData(
      {
        uploadId: "upload-1",
        tenantId: "tenant-1",
        mapping: {},
      },
      runtime,
    );

    assert.equal(calls.modelMetadata.length, 1);
    assert.equal(calls.modelMetadata[0].uploadId, "upload-1");
    assert.equal(calls.modelMetadata[0].projections.length, 30);
    assert.ok(events.some(({ type }) => type === "modelTrained"));
    assert.equal(
      events.some(({ type }) => type === "modelTrainingSkipped"),
      false,
    );
  });

  it("marca upload como ERROR quando nenhuma linha sobra após limpeza", async () => {
    const parsedRows = [
      buildParsedUploadRow(0, {
        data_venda: "",
        valor_bruto: "",
        produto_nome: "",
      }),
    ];
    const { calls, dependencies } = createInsertUseCaseDependencies(parsedRows);
    const insertUploadData = createInsertUploadDataUseCase(dependencies);

    await assert.rejects(
      () =>
        insertUploadData({
          uploadId: "upload-1",
          tenantId: "tenant-1",
          mapping: {},
        }),
      (error) => {
        assert.match(error.message, /Nenhuma linha válida após limpeza/i);
        return true;
      },
    );

    assert.deepEqual(calls.statuses, [
      { uploadId: "upload-1", status: "ERROR" },
    ]);
    assert.equal(calls.sales.length, 0);
  });
  it("usa branch_id do mapping sem consultar a branch padrao", async () => {
    const parsedRows = Array.from({ length: 8 }, (_, index) =>
      buildParsedUploadRow(index),
    );
    const { calls, dependencies } = createInsertUseCaseDependencies(parsedRows);
    const insertUploadData = createInsertUploadDataUseCase(dependencies);

    await insertUploadData({
      uploadId: "upload-1",
      tenantId: "tenant-1",
      mapping: {
        branch_id: "branch-explicit",
      },
    });

    assert.deepEqual(calls.branchQueries, []);
    assert.equal(calls.sales.length, 1);
    assert.equal(calls.sales[0].branchId, "branch-explicit");
    assert.equal(calls.anomalies[0].anomalies[0].branchId, "branch-explicit");
    assert.equal(
      calls.dailyMetrics[0].metrics.every(
        (metric) => metric.branchId === "branch-explicit",
      ),
      true,
    );
  });

  it("falha cedo quando o upload nao existe", async () => {
    const parsedRows = Array.from({ length: 8 }, (_, index) =>
      buildParsedUploadRow(index),
    );
    const { calls, dependencies } = createInsertUseCaseDependencies(parsedRows);
    let readAttempts = 0;

    dependencies.uploadRepository.findByIdAndTenant = async () => null;
    dependencies.uploadFileGateway.readUpload = async () => {
      readAttempts++;
      return {
        filePath: "/tmp/sales.csv",
        rows: parsedRows,
        columns: Object.keys(parsedRows[0] ?? {}),
      };
    };

    const insertUploadData = createInsertUploadDataUseCase(dependencies);

    await assert.rejects(
      () =>
        insertUploadData({
          uploadId: "upload-1",
          tenantId: "tenant-1",
          mapping: {},
        }),
      (error) => {
        assert.match(error.message, /Upload upload-1/i);
        assert.match(error.message, /encontrado/i);
        return true;
      },
    );

    assert.equal(readAttempts, 0);
    assert.deepEqual(calls.statuses, []);
    assert.equal(calls.sales.length, 0);
    assert.equal(calls.anomalies.length, 0);
    assert.equal(calls.dailyMetrics.length, 0);
  });
});
