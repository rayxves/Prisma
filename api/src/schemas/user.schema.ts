import { z } from "zod";
import { UserRole } from "../types/enums.js";

export const createUserSchema = z.object({
	nome: z.string().min(2).max(100),
	email: z.email(),
	senha: z.string().min(8).max(72),
	role: z.enum(UserRole).default(UserRole.EDITOR),
});

export const updateUserSchema = createUserSchema
	.partial()
	.omit({ senha: true });

export const changePasswordSchema = z
	.object({
		senha_atual: z.string().min(8),
		nova_senha: z.string().min(8).max(72),
		confirmar_senha: z.string().min(8).max(72),
	})
	.refine((data) => data.nova_senha === data.confirmar_senha, {
		message: "As senhas não coincidem",
		path: ["confirmar_senha"],
	});

export const loginSchema = z.object({
	email: z.email(),
	senha: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
