import { z } from "zod";

export const registerSchema = z.object({
  // Dados do Tenant
  nome_fantasia: z.string().min(2, "Nome muito curto"),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos sem pontuação"),

  // Dados do primeiro usuário Admin
  nome: z.string().min(2, "Nome muito curto"),
  email: z.email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
