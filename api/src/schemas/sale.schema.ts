import { z } from "zod";

export const saleRowSchema = z.object({
	external_id: z.string().min(1).max(255).optional(),
	data_venda: z.coerce
		.date()
		.refine((d) => d <= new Date(), "Data de venda não pode ser no futuro"),
	valor_bruto: z.coerce
		.number()
		.nonnegative("Valor bruto deve ser positivo")
		.max(999_999_999, "Valor fora do limite permitido"),
	custo_total: z.coerce
		.number()
		.nonnegative("Custo total deve ser positivo")
		.max(999_999_999, "Valor fora do limite permitido"),
	categoria: z
		.string()
		.transform((v) => v.trim())
		.pipe(z.string().min(1).max(100)),
	produto_nome: z
		.string()
		.transform((v) => v.trim())
		.pipe(z.string().min(1).max(255)),
	quantidade: z.coerce
		.number()
		.int()
		.nonnegative("Quantidade deve ser positiva"),
});

export const createSaleSchema = saleRowSchema.extend({
	branch_id: z.uuid(),
});

export const saleFiltersSchema = z
	.object({
		branch_id: z.uuid().optional(),
		categoria: z
			.string()
			.transform((v) => v.trim())
			.optional(),
		data_inicio: z.coerce.date().optional(),
		data_fim: z.coerce.date().optional(),
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
	})
	.refine(
		({ data_inicio, data_fim }) =>
			!data_inicio || !data_fim || data_fim >= data_inicio,
		{
			message: "data_fim deve ser posterior ou igual a data_inicio",
			path: ["data_fim"],
		},
	);

export type SaleRowInput = z.infer<typeof saleRowSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
