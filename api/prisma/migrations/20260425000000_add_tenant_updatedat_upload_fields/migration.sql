ALTER TABLE "tenants" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "raw_uploads" ADD COLUMN "error_message" TEXT;
ALTER TABLE "raw_uploads" ADD COLUMN "branch_id" TEXT;

ALTER TABLE "raw_uploads" ADD CONSTRAINT "raw_uploads_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sales_produto_nome_idx" ON "sales"("produto_nome");

CREATE INDEX "daily_metrics_branch_id_date_idx" ON "daily_metrics"("branch_id", "data");
