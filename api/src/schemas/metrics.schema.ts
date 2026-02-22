import { z } from "zod";

export const dailyMetricsFiltersSchema = z.object({
	branch_id: z.uuid().optional(),
	data_inicio: z.coerce.date().optional(),
	data_fim: z.coerce.date().optional(),
});

export const upsertDailyMetricsSchema = z.object({
	data: z.coerce.date(),
	total_vendas: z.number().nonnegative(),
	roi_dia: z.number(),
	margem_dia: z.number(),
	qtd_anomalias: z.number().int().nonnegative().default(0),
	branch_id: z.uuid(),
});

export type DailyMetricsFilters = z.infer<typeof dailyMetricsFiltersSchema>;
export type UpsertDailyMetricsInput = z.infer<typeof upsertDailyMetricsSchema>;
