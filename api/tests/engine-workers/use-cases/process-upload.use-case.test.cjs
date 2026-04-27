const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { loadTsModule } = require("../helpers/load-ts-module.cjs");
const { buildUploadRecord } = require("../helpers/fixtures.cjs");

const { createProcessUploadUseCase } = loadTsModule(
  "src/engine/application/use-cases/process-upload.use-case.ts",
);
const { UploadFileNotFoundError } = loadTsModule(
  "src/engine/application/contracts/upload-engine.contracts.ts",
);

describe("engine/application/use-cases/process-upload.use-case", () => {
  it("marca o upload como PROCESSING, sugere mapeamento e atualiza progresso", async () => {
    const statuses = [];
    let savedSuggestedMapping = null;
    const progressUpdates = [];

    const processUpload = createProcessUploadUseCase({
      uploadRepository: {
        async updateStatus(uploadId, status) {
          statuses.push({ uploadId, status });
        },
        async findByIdAndTenant() {
          return buildUploadRecord();
        },
        async saveSuggestedMapping(uploadId, suggestedMapping) {
          savedSuggestedMapping = { uploadId, suggestedMapping };
        },
      },
      uploadFileGateway: {
        async readUpload() {
          return {
            filePath: "/tmp/sales.csv",
            rows: [],
            columns: [
              "Data Venda",
              "Valor Bruto",
              "Custo Total",
              "Produto",
              "Qtd",
              "Codigo",
            ],
          };
        },
      },
    });

    const result = await processUpload(
      {
        uploadId: "upload-1",
        tenantId: "tenant-1",
      },
      {
        progressReporter: {
          async update(progress) {
            progressUpdates.push(progress);
          },
        },
      },
    );

    assert.deepEqual(statuses, [
      { uploadId: "upload-1", status: "PROCESSING" },
    ]);
    assert.equal(result.columnCount, 6);
    assert.equal(savedSuggestedMapping.uploadId, "upload-1");
    assert.equal(
      savedSuggestedMapping.suggestedMapping.data_venda,
      "Data Venda",
    );
    assert.equal(
      savedSuggestedMapping.suggestedMapping.valor_bruto,
      "Valor Bruto",
    );
    assert.deepEqual(progressUpdates, [100]);
  });

  it("marca o upload como ERROR quando o arquivo não existe", async () => {
    const statuses = [];

    const processUpload = createProcessUploadUseCase({
      uploadRepository: {
        async updateStatus(uploadId, status) {
          statuses.push({ uploadId, status });
        },
        async findByIdAndTenant() {
          return buildUploadRecord();
        },
        async saveSuggestedMapping() {
          throw new Error("não deve salvar mapeamento quando o arquivo falha");
        },
      },
      uploadFileGateway: {
        async readUpload() {
          throw new UploadFileNotFoundError("/tmp/missing.csv");
        },
      },
    });

    await assert.rejects(
      () =>
        processUpload({
          uploadId: "upload-1",
          tenantId: "tenant-1",
        }),
      (error) => {
        assert.match(error.message, /Arquivo não encontrado/i);
        return true;
      },
    );

    assert.deepEqual(statuses, [
      { uploadId: "upload-1", status: "PROCESSING" },
      { uploadId: "upload-1", status: "ERROR" },
    ]);
  });
  it("falha quando o upload nao existe antes de ler o arquivo", async () => {
    const statuses = [];
    let readAttempts = 0;
    let saveSuggestedMappingCalls = 0;

    const processUpload = createProcessUploadUseCase({
      uploadRepository: {
        async updateStatus(uploadId, status) {
          statuses.push({ uploadId, status });
        },
        async findByIdAndTenant() {
          return null;
        },
        async saveSuggestedMapping() {
          saveSuggestedMappingCalls++;
        },
      },
      uploadFileGateway: {
        async readUpload() {
          readAttempts++;
          throw new Error("nao deve tentar ler arquivo");
        },
      },
    });

    await assert.rejects(
      () =>
        processUpload({
          uploadId: "upload-1",
          tenantId: "tenant-1",
        }),
      (error) => {
        assert.match(error.message, /Upload upload-1/i);
        assert.match(error.message, /encontrado/i);
        return true;
      },
    );

    assert.deepEqual(statuses, [
      { uploadId: "upload-1", status: "PROCESSING" },
    ]);
    assert.equal(readAttempts, 0);
    assert.equal(saveSuggestedMappingCalls, 0);
  });
});
