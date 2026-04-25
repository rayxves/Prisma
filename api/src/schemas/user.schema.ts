import { z } from "zod";
import { passwordSchema } from "./auth.schema";

export const createUserSchema = z.object({
	name: z
		.string()
		.transform((v) => v.trim())
		.pipe(z.string().min(2, "Nome muito curto").max(100)),
	email: z.email("E-mail inválido").transform((v) => v.toLowerCase().trim()),
	password: passwordSchema,
	role: z.enum(["ADMIN", "EDITOR"] as const).default("EDITOR"),
});

export const updateUserSchema = createUserSchema
	.partial()
	.omit({ password: true })
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		message: "Ao menos um campo deve ser fornecido",
	});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Senha atual obrigatória"),
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine(
		({ newPassword, confirmPassword }) => newPassword === confirmPassword,
		{ message: "As senhas não coincidem", path: ["confirmPassword"] },
	)
	.refine(
		({ currentPassword, newPassword }) => newPassword !== currentPassword,
		{
			message: "A nova senha deve ser diferente da atual",
			path: ["newPassword"],
		},
	);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
