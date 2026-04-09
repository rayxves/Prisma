import { prisma } from '../lib/prisma';

const branchSelect = {
  id: true,
  name: true,
  city: true,
  state: true,
  monthlyGoal: true,
  createdAt: true,
} as const;

// ─── List ─────────────────────────────────────────────────────────────────────
export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    select: branchSelect,
    orderBy: { name: 'asc' },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createBranch(
  tenantId: string,
  data: { name: string; city: string; state: string; monthlyGoal: number }
) {
  return prisma.branch.create({
    data: { ...data, tenantId },
    select: branchSelect,
  });
}

// ─── Get by ID ────────────────────────────────────────────────────────────────
export async function getBranchById(tenantId: string, id: string) {
  const branch = await prisma.branch.findFirst({
    where: { id, tenantId },
    select: branchSelect,
  });
  if (!branch) throw new Error('Filial não encontrada');
  return branch;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateBranch(
  tenantId: string,
  id: string,
  data: { name?: string; city?: string; state?: string; monthlyGoal?: number }
) {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
  if (!branch) throw new Error('Filial não encontrada');

  return prisma.branch.update({
    where: { id },
    data,
    select: branchSelect,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteBranch(tenantId: string, id: string) {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
  if (!branch) throw new Error('Filial não encontrada');

  await prisma.branch.delete({ where: { id } });
}
