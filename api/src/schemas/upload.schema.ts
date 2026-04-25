import { z } from "zod";

const REQUIRED_MAPPING_FIELDS = [
	"data_venda",
	"valor_bruto",
	"custo_total",
	"produto_nome",
	"quantidade",
] as const;

export const confirmMappingSchema = z.object({
	mapping: z
		.record(z.string(), z.string())
		.refine(
			(m) => REQUIRED_MAPPING_FIELDS.every((field) => Boolean(m[field])),
			{
				message: `Mapeamento deve incluir: ${REQUIRED_MAPPING_FIELDS.join(", ")}`,
			},
		),
	branchId: z.uuid("branchId deve ser um UUID válido"),
});

export type ConfirmMappingInput = z.infer<typeof confirmMappingSchema>;
