import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/app-error';
import { logAction } from './audit-logs.service';

const BCRYPT_ROUNDS = 10;

const userSelect = {
  id:        true,
  name:      true,
  email:     true,
  role:      true,
  createdAt: true,
} as const;

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where:   { tenantId },
    select:  userSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(
  tenantId:  string,
  requesterId: string,
  data: { name: string; email: string; password: string; role: 'ADMIN' | 'EDITOR' },
) {
  const existing = await prisma.user.findUnique({
    where: { email_tenantId: { email: data.email, tenantId } },
  });
  if (existing) throw new ConflictError('E-mail já cadastrado nesta empresa');

  const hashed = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data:   { ...data, password: hashed, tenantId },
    select: userSelect,
  });

  await logAction(tenantId, requesterId, `CREATE_USER:${user.id}`);
  return user;
}

export async function getUserById(tenantId: string, id: string) {
  const user = await prisma.user.findFirst({
    where:  { id, tenantId },
    select: userSelect,
  });
  if (!user) throw new NotFoundError('Usuário não encontrado');
  return user;
}

export async function updateUser(
  tenantId:    string,
  id:          string,
  requesterId: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'EDITOR' },
) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  if (data.email && data.email !== user.email) {
    const conflict = await prisma.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId } },
    });
    if (conflict) throw new ConflictError('E-mail já está em uso');
  }

  const updated = await prisma.user.update({
    where:  { id },
    data,
    select: userSelect,
  });

  await logAction(tenantId, requesterId, `UPDATE_USER:${id}`);
  return updated;
}

export async function deleteUser(tenantId: string, id: string, requesterId: string) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  await prisma.user.delete({ where: { id } });
  await logAction(tenantId, requesterId, `DELETE_USER:${id}`);
}

export async function updatePassword(
  tenantId:        string,
  targetId:        string,
  requesterId:     string,
  requesterRole:   string,
  currentPassword: string,
  newPassword:     string,
) {
  const user = await prisma.user.findFirst({ where: { id: targetId, tenantId } });
  if (!user) throw new NotFoundError('Usuário não encontrado');

  if (requesterId !== targetId && requesterRole !== 'ADMIN') {
    throw new ForbiddenError('Sem permissão para alterar senha de outro usuário');
  }

  if (requesterId === targetId) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new ForbiddenError('Senha atual incorreta');
  }

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: targetId }, data: { password: hashed } });
  await logAction(tenantId, requesterId, `CHANGE_PASSWORD:${targetId}`);
}
