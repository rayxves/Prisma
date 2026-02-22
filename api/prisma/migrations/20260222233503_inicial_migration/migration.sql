-- CreateEnum
CREATE TYPE "PlanAssinatura" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDENTE', 'PROCESSADO', 'ERRO');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "plano_assinatura" "PlanAssinatura" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "meta_mensal" DECIMAL(15,2) NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_uploads" (
    "id" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "data_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDENTE',
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "raw_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "data_venda" TIMESTAMP(3) NOT NULL,
    "valor_bruto" DECIMAL(15,2) NOT NULL,
    "custo_total" DECIMAL(15,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "produto_nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "total_vendas" DECIMAL(15,2) NOT NULL,
    "roi_dia" DECIMAL(10,4) NOT NULL,
    "margem_dia" DECIMAL(10,4) NOT NULL,
    "qtd_anomalias" INTEGER NOT NULL DEFAULT 0,
    "branch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_tenant_id_key" ON "users"("email", "tenant_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_data_venda_idx" ON "sales"("tenant_id", "data_venda");

-- CreateIndex
CREATE INDEX "sales_branch_id_data_venda_idx" ON "sales"("branch_id", "data_venda");

-- CreateIndex
CREATE UNIQUE INDEX "sales_external_id_tenant_id_key" ON "sales"("external_id", "tenant_id");

-- CreateIndex
CREATE INDEX "daily_metrics_tenant_id_data_idx" ON "daily_metrics"("tenant_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_data_branch_id_key" ON "daily_metrics"("data", "branch_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_uploads" ADD CONSTRAINT "raw_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_uploads" ADD CONSTRAINT "raw_uploads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
