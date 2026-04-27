import { prisma } from '../lib/prisma';
import { NotFoundError } from '../shared/errors/app-error';

const branchSelect = {
  id: true,
  name: true,
  city: true,
  state: true,
  monthlyGoal: true,
  createdAt: true,
} as const;

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    select: branchSelect,
    orderBy: { name: 'asc' },
  });
}

export async function createBranch(
  tenantId: string,
  data: { name: string; city: string; state: string; monthlyGoal: number }
) {
  return prisma.branch.create({
    data: { ...data, tenantId },
    select: branchSelect,
  });
}

export async function getBranchById(tenantId: string, id: string) {
  const branch = await prisma.branch.findFirst({
    where: { id, tenantId },
    select: branchSelect,
  });
  if (!branch) throw new NotFoundError('Filial não encontrada');
  return branch;
}

export async function updateBranch(
  tenantId: string,
  id: string,
  data: { name?: string; city?: string; state?: string; monthlyGoal?: number }
) {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
  if (!branch) throw new NotFoundError('Filial não encontrada');

  return prisma.branch.update({
    where: { id },
    data,
    select: branchSelect,
  });
}

export async function deleteBranch(tenantId: string, id: string) {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
  if (!branch) throw new NotFoundError('Filial não encontrada');

  await prisma.branch.delete({ where: { id } });
}
