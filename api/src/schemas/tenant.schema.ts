import { z } from "zod";

export const updateTenantSchema = z
	.object({
		name: z
			.string()
			.transform((v) => v.trim())
			.pipe(z.string().min(2, "Nome precisa ter no mínimo 2 caracteres").max(150))
			.optional(),
		plan: z.enum(["FREE", "PRO", "ENTERPRISE"] as const).optional(),
	})
	.refine((data) => data.name !== undefined || data.plan !== undefined, {
		message: "Ao menos um campo deve ser fornecido",
	});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
