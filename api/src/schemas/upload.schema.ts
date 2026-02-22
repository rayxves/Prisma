import { z } from "zod";
import { UploadStatus } from "../types/enums.js";

export const updateUploadStatusSchema = z.object({
	status: z.enum(UploadStatus),
});

export const columnMappingSchema = z.object({
	upload_id: z.uuid(),
	mapeamento: z.object({
		data_venda: z.string(),
		valor_bruto: z.string(),
		custo_total: z.string(),
		categoria: z.string(),
		produto_nome: z.string(),
		quantidade: z.string(),
		external_id: z.string().optional(),
	}),
	branch_id: z.uuid(),
});

export type UpdateUploadStatusInput = z.infer<typeof updateUploadStatusSchema>;
export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;
