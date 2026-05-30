-- Troca a constraint unique de vendas para incluir branch_id,
-- permitindo que filiais diferentes tenham IDs externos iguais.
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_external_id_tenant_id_key";
ALTER TABLE "sales" ADD CONSTRAINT "sales_external_id_tenant_id_branch_id_key" UNIQUE ("external_id", "tenant_id", "branch_id");
