const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");

const { createInsertUploadDataJobHandler } = loadTsModule(
  "src/workers/handlers/insert-upload-data-job.handler.ts",
);
const { createProcessUploadJobHandler } = loadTsModule(
  "src/workers/handlers/process-upload-job.handler.ts",
);

function createLoggerSpy() {
  const calls = [];

  return {
    calls,
    logger: {
      logSuggestedMappingReady(uploadId, columnCount) {
        calls.push({ type: "suggestedMappingReady", uploadId, columnCount });
      },
      logRowsCleaned(details) {
        calls.push({ type: "rowsCleaned", details });
      },
      logDiagnostics(details) {
        calls.push({ type: "diagnostics", details });
      },
      logModelTrained(uploadId, model) {
        calls.push({ type: "modelTrained", uploadId, model });
      },
      logModelTrainingSkipped(uploadId, encodedRowCount) {
        calls.push({
          type: "modelTrainingSkipped",
          uploadId,
          encodedRowCount,
        });
      },
      logPipelineCompleted(uploadId, anomalyCount) {
        calls.push({ type: "pipelineCompleted", uploadId, anomalyCount });
      },
      warnUnknownJob() {},
      logWorkerCompleted() {},
      logWorkerFailed() {},
      logWorkerStalled() {},
    },
  };
}

function createJob(data) {
  return {
    data,
    progressUpdates: [],
    async updateProgress(progress) {
      this.progressUpdates.push(progress);
    },
  };
}

describe("workers handlers", () => {
  it("encaminha process-upload para o caso de uso e registra log de conclusão", async () => {
    const job = createJob({
      uploadId: "upload-1",
      tenantId: "tenant-1",
    });
    const { calls, logger } = createLoggerSpy();
    let receivedInput = null;

    const handler = createProcessUploadJobHandler({
      async processUpload(input, runtime) {
        receivedInput = input;
        await runtime.progressReporter.update(100);
        return { columnCount: 6 };
      },
      logger,
    });

    await handler(job);

    assert.deepEqual(receivedInput, {
      uploadId: "upload-1",
      tenantId: "tenant-1",
    });
    assert.deepEqual(job.progressUpdates, [100]);
    assert.deepEqual(calls, [
      {
        type: "suggestedMappingReady",
        uploadId: "upload-1",
        columnCount: 6,
      },
    ]);
  });

  it("encaminha insert-data, limpa o arquivo e liga observer com logger", async () => {
    const job = createJob({
      uploadId: "upload-1",
      tenantId: "tenant-1",
      mapping: { data_venda: "Data Venda" },
    });
    const { calls, logger } = createLoggerSpy();
    const deletedFiles = [];
    let receivedInput = null;

    const handler = createInsertUploadDataJobHandler({
      async insertUploadData(input, runtime) {
        receivedInput = input;
        await runtime.progressReporter.update(65);
        await runtime.observer.onRowsCleaned({
          uploadId: "upload-1",
          validRows: 10,
          discardedRows: 2,
          outliersCapped: 1,
        });
        await runtime.observer.onDiagnosticsComputed({
          uploadId: "upload-1",
          roi: 12.5,
          margin: 8.2,
        });
        await runtime.observer.onModelTrainingSkipped({
          uploadId: "upload-1",
          encodedRowCount: 8,
        });
        return {
          filePath: "/tmp/sales.csv",
          anomalyCount: 3,
        };
      },
      uploadFileGateway: {
        async deleteUpload(filePath) {
          deletedFiles.push(filePath);
        },
      },
      logger,
    });

    await handler(job);

    assert.deepEqual(receivedInput, {
      uploadId: "upload-1",
      tenantId: "tenant-1",
      mapping: { data_venda: "Data Venda" },
    });
    assert.deepEqual(job.progressUpdates, [65, 100]);
    assert.deepEqual(deletedFiles, ["/tmp/sales.csv"]);
    assert.ok(calls.some((entry) => entry.type === "rowsCleaned"));
    assert.ok(calls.some((entry) => entry.type === "diagnostics"));
    assert.ok(calls.some((entry) => entry.type === "modelTrainingSkipped"));
    assert.ok(
      calls.some(
        (entry) =>
          entry.type === "pipelineCompleted" && entry.anomalyCount === 3,
      ),
    );
  });
  it("propaga erro de process-upload sem registrar conclusao", async () => {
    const job = createJob({
      uploadId: "upload-1",
      tenantId: "tenant-1",
    });
    const { calls, logger } = createLoggerSpy();

    const handler = createProcessUploadJobHandler({
      async processUpload(_input, runtime) {
        await runtime.progressReporter.update(40);
        throw new Error("process failed");
      },
      logger,
    });

    await assert.rejects(() => handler(job), /process failed/);

    assert.deepEqual(job.progressUpdates, [40]);
    assert.deepEqual(calls, []);
  });

  it("nao remove arquivo nem marca pipeline completo quando insert-data falha", async () => {
    const job = createJob({
      uploadId: "upload-1",
      tenantId: "tenant-1",
      mapping: { data_venda: "Data Venda" },
    });
    const { calls, logger } = createLoggerSpy();
    const deletedFiles = [];

    const handler = createInsertUploadDataJobHandler({
      async insertUploadData(_input, runtime) {
        await runtime.progressReporter.update(55);
        await runtime.observer.onRowsCleaned({
          uploadId: "upload-1",
          validRows: 3,
          discardedRows: 1,
          outliersCapped: 0,
        });
        throw new Error("insert failed");
      },
      uploadFileGateway: {
        async deleteUpload(filePath) {
          deletedFiles.push(filePath);
        },
      },
      logger,
    });

    await assert.rejects(() => handler(job), /insert failed/);

    assert.deepEqual(job.progressUpdates, [55]);
    assert.deepEqual(deletedFiles, []);
    assert.ok(calls.some((entry) => entry.type === "rowsCleaned"));
    assert.equal(
      calls.some((entry) => entry.type === "pipelineCompleted"),
      false,
    );
  });
});
