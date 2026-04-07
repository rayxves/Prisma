import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

// ─── List ─────────────────────────────────────────────────────────────────────
export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createUser(
  tenantId: string,
  data: { name: string; email: string; password: string; role: 'ADMIN' | 'EDITOR' }
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('E-mail já cadastrado');

  const hashed = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: { ...data, password: hashed, tenantId },
    select: userSelect,
  });
}

// ─── Get by ID ────────────────────────────────────────────────────────────────
export async function getUserById(tenantId: string, id: string) {
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    select: userSelect,
  });
  if (!user) throw new Error('Usuário não encontrado');
  return user;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateUser(
  tenantId: string,
  id: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'EDITOR' }
) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new Error('Usuário não encontrado');

  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteUser(tenantId: string, id: string) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new Error('Usuário não encontrado');

  await prisma.user.delete({ where: { id } });
}

// ─── Update Password ──────────────────────────────────────────────────────────
// Valida a senha atual antes de trocar — evita troca silenciosa por admin
export async function updatePassword(
  tenantId: string,
  targetId: string,
  requesterId: string,
  requesterRole: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findFirst({ where: { id: targetId, tenantId } });
  if (!user) throw new Error('Usuário não encontrado');

  // Apenas o próprio usuário ou um Admin podem trocar a senha
  if (requesterId !== targetId && requesterRole !== 'ADMIN') {
    throw new Error('Sem permissão para alterar senha de outro usuário');
  }

  // Admin trocando senha de outro usuário não precisa informar a atual
  if (requesterId === targetId) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new Error('Senha atual incorreta');
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: targetId }, data: { password: hashed } });
}
