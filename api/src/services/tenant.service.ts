import { PlanAssinatura } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { NotFoundError } from '../shared/errors/app-error';
import { logAction } from './audit-logs.service';

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { id: true, name: true, cnpj: true, plan: true, createdAt: true, updatedAt: true },
  });
  if (!tenant) throw new NotFoundError('Empresa não encontrada');
  return tenant;
}

export async function updateTenant(
  tenantId:    string,
  requesterId: string,
  data: { name?: string; plan?: PlanAssinatura },
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Empresa não encontrada');

  const updated = await prisma.tenant.update({
    where:  { id: tenantId },
    data,
    select: { id: true, name: true, cnpj: true, plan: true, updatedAt: true },
  });

  await logAction(tenantId, requesterId, 'UPDATE_TENANT');
  return updated;
}
