import { z } from "zod";

const isValidCNPJ = (cnpj: string): boolean => {
	if (/^(\d)\1+$/.test(cnpj)) return false;

	const calcDigit = (digits: string, weights: number[]): number => {
		const sum = weights.reduce(
			(acc, w, i) => acc + Number.parseInt(digits[i]!) * w,
			0,
		);
		const rem = sum % 11;
		return rem < 2 ? 0 : 11 - rem;
	};

	const d1 = calcDigit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
	if (d1 !== Number.parseInt(cnpj[12]!)) return false;

	const d2 = calcDigit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
	return d2 === Number.parseInt(cnpj[13]!);
};

export const cnpjSchema = z
	.string()
	.transform((v) => v.replaceAll(/\D/g, ""))
	.pipe(
		z
			.string()
			.length(14, "CNPJ deve conter 14 dígitos")
			.refine(isValidCNPJ, "CNPJ inválido"),
	);

export const passwordSchema = z
	.string()
	.min(8, "Senha deve ter no mínimo 8 caracteres")
	.max(72, "Senha deve ter no máximo 72 caracteres")
	.regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
	.regex(/[0-9]/, "Senha deve conter ao menos um número");

export const registerSchema = z.object({
	companyName: z
		.string()
		.min(2, "Nome muito curto")
		.max(150)
		.transform((v) => v.trim()),
	cnpj: cnpjSchema,
	adminName: z
		.string()
		.min(2, "Nome muito curto")
		.max(100)
		.transform((v) => v.trim()),
	email: z.email("E-mail inválido").transform((v) => v.toLowerCase().trim()),
	password: passwordSchema,
});

export const loginSchema = z.object({
	cnpj: cnpjSchema,
	email: z.email("E-mail inválido").transform((v) => v.toLowerCase().trim()),
	password: z.string().min(1, "Senha obrigatória").max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
