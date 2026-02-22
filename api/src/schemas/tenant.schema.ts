import { z } from "zod";
import { PlanAssinatura } from "../types/enums.js";

export const createTenantSchema = z.object({
	nome_fantasia: z.string().min(2).max(150),
	cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos numéricos"),
	plano_assinatura: z.enum(PlanAssinatura).default(PlanAssinatura.FREE),
});

export const updateTenantSchema = createTenantSchema.partial().omit({
	cnpj: true,
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
