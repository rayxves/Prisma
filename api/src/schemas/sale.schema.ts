import { z } from "zod";

export const saleRowSchema = z.object({
	external_id: z.string().min(1),
	data_venda: z.coerce.date(),
	valor_bruto: z.coerce.number().nonnegative(),
	custo_total: z.coerce.number().nonnegative(),
	categoria: z.string().min(1).max(100),
	produto_nome: z.string().min(1).max(255),
	quantidade: z.coerce.number().int().nonnegative(),
});

export const createSaleSchema = saleRowSchema.extend({
	branch_id: z.uuid(),
});

export const saleFiltersSchema = z.object({
	branch_id: z.string().uuid().optional(),
	categoria: z.string().optional(),
	data_inicio: z.coerce.date().optional(),
	data_fim: z.coerce.date().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SaleRowInput = z.infer<typeof saleRowSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
