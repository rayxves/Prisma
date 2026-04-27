import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

import { env } from '../config/env';
import { ConflictError, UnauthorizedError } from '../shared/errors/app-error';
import { prisma } from '../lib/prisma';
import { logAction } from './audit-logs.service';

const BCRYPT_ROUNDS = 10;

interface RegisterInput {
  companyName: string;
  cnpj:        string;
  adminName:   string;
  email:       string;
  password:    string;
}

interface LoginInput {
  email:    string;
  password: string;
  cnpj:     string;
}

export async function register({ companyName, cnpj, adminName, email, password }: RegisterInput) {
  const existing = await prisma.tenant.findUnique({ where: { cnpj } });
  if (existing) throw new ConflictError('CNPJ já cadastrado');

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
      cnpj,
      users: {
        create: {
          name:     adminName,
          email,
          password: hashed,
          role:     'ADMIN',
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  if (!user) throw new Error('Falha ao criar usuário administrador');

  await logAction(tenant.id, user.id, 'REGISTER');
  return { tenantId: tenant.id, userId: user.id };
}

export async function login({ email, password, cnpj }: LoginInput) {
  const tenant = await prisma.tenant.findUnique({ where: { cnpj } });
  if (!tenant) throw new UnauthorizedError('Credenciais inválidas');

  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId: tenant.id } },
  });
  if (!user) throw new UnauthorizedError('Credenciais inválidas');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError('Credenciais inválidas');

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as StringValue },
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      tenantId:  true,
      createdAt: true,
    },
  });
}
