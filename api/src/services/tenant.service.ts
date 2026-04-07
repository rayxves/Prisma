import { prisma } from '../lib/prisma';

// ─── Get Tenant ───────────────────────────────────────────────────────────────
export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, cnpj: true, plan: true, createdAt: true },
  });
  if (!tenant) throw new Error('Empresa não encontrada');
  return tenant;
}

// ─── Update Tenant ────────────────────────────────────────────────────────────
export async function updateTenant(
  tenantId: string,
  data: { name?: string; cnpj?: string; plan?: string }
) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data,
    select: { id: true, name: true, cnpj: true, plan: true, updatedAt: true },
  });
}
