ALTER TABLE "raw_uploads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'AWAITING_MAPPING', 'DONE', 'ERROR');
ALTER TABLE "raw_uploads"
  ALTER COLUMN "status" TYPE "UploadStatus"
    USING CASE status::text
      WHEN 'PENDENTE'   THEN 'PENDING'::text
      WHEN 'PROCESSADO' THEN 'DONE'::text
      WHEN 'ERRO'       THEN 'ERROR'::text
      ELSE 'PENDING'::text
    END::"UploadStatus";
ALTER TABLE "raw_uploads" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"UploadStatus";
DROP TYPE "UploadStatus_old";

ALTER TABLE "raw_uploads" ADD COLUMN IF NOT EXISTS "nome_arquivo_original" TEXT NOT NULL DEFAULT '';
ALTER TABLE "raw_uploads" ADD COLUMN IF NOT EXISTS "suggested_mapping"     JSONB;
ALTER TABLE "raw_uploads" ADD COLUMN IF NOT EXISTS "mapping"               JSONB;
ALTER TABLE "raw_uploads" ADD COLUMN IF NOT EXISTS "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "sales_produto_nome_idx"             ON "sales"("produto_nome");
CREATE INDEX IF NOT EXISTS "daily_metrics_branch_id_date_idx"   ON "daily_metrics"("branch_id", "data");
CREATE INDEX IF NOT EXISTS "sales_tenant_id_data_venda_idx"     ON "sales"("tenant_id", "data_venda");
CREATE INDEX IF NOT EXISTS "sales_branch_id_data_venda_idx"     ON "sales"("branch_id", "data_venda");
CREATE INDEX IF NOT EXISTS "daily_metrics_tenant_id_date_idx"   ON "daily_metrics"("tenant_id", "data");
CREATE INDEX IF NOT EXISTS "anomalies_tenant_id_detected_at_idx" ON "anomalies"("tenant_id", "detected_at");
CREATE INDEX IF NOT EXISTS "anomalies_tenant_id_branch_id_idx"  ON "anomalies"("tenant_id", "branch_id");
