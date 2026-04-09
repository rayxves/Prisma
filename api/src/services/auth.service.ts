import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

interface RegisterInput {
  companyName: string;
  cnpj: string;
  adminName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export async function register({
  companyName,
  cnpj,
  adminName,
  email,
  password,
}: RegisterInput) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) throw new Error("E-mail já cadastrado");

  const hashed = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
      cnpj,
      users: {
        create: {
          name: adminName,
          email,
          password: hashed,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  return { tenantId: tenant.id, userId: user.id };
}

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Credenciais inválidas");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Credenciais inválidas");

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
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
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });
}
