import { z } from "zod";

const BR_STATES = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
] as const;

export const createBranchSchema = z.object({
	name: z
		.string()
		.transform((v) => v.trim())
		.pipe(
			z.string().min(2, "Nome precisa ter no mínimo 2 caracteres").max(100),
		),
	city: z
		.string()
		.transform((v) => v.trim())
		.pipe(
			z.string().min(2, "Cidade precisa ter no mínimo 2 caracteres").max(100),
		),
	state: z.enum(BR_STATES, { error: "Estado inválido" }),
	monthlyGoal: z.coerce
		.number({ error: "Meta mensal inválida" })
		.positive("Meta deve ser positiva")
		.max(999_999_999, "Valor fora do limite permitido"),
});

export const updateBranchSchema = createBranchSchema
	.partial()
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		message: "Ao menos um campo deve ser fornecido",
	});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
