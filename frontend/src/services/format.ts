const brlFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const compactFormatter = new Intl.NumberFormat("pt-BR", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function formatBRL(value: number | string | null | undefined): string {
	if (value === null || value === undefined || value === "") return "R$ 0,00";
	const num = typeof value === "string" ? Number(value) : value;
	if (!Number.isFinite(num)) return "R$ 0,00";
	return brlFormatter.format(num);
}

export function formatBRLCompact(
	value: number | string | null | undefined,
): string {
	if (value === null || value === undefined || value === "") return "R$ 0";
	const num = typeof value === "string" ? Number(value) : value;
	if (!Number.isFinite(num)) return "R$ 0";
	return `R$ ${compactFormatter.format(num)}`;
}

export function formatPercent(
	value: number | string | null | undefined,
	fractionDigits = 2,
): string {
	if (value === null || value === undefined || value === "") return "0,00%";
	const num = typeof value === "string" ? Number(value) : value;
	if (!Number.isFinite(num)) return "0,00%";
	return `${num.toFixed(fractionDigits).replace(".", ",")}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return "";
	const d = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(
	value: string | Date | null | undefined,
): string {
	if (!value) return "";
	const d = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("pt-BR");
}

export function formatNumber(
	value: number | string | null | undefined,
): string {
	if (value === null || value === undefined || value === "") return "0";
	const num = typeof value === "string" ? Number(value) : value;
	if (!Number.isFinite(num)) return "0";
	return new Intl.NumberFormat("pt-BR").format(num);
}

export function maskCNPJ(value: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 14);
	return digits
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
		.replace(/\.(\d{3})(\d)/, ".$1/$2")
		.replace(/(\d{4})(\d)/, "$1-$2");
}

export function unmaskCNPJ(value: string): string {
	return value.replace(/\D/g, "");
}
