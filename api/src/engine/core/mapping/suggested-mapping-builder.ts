export type SuggestedMapping = Record<string, string | null>;

const FIELD_ALIASES: Record<string, string[]> = {
  data_venda: [
    "data",
    "date",
    "data_venda",
    "dt_venda",
    "dt venda",
    "data venda",
    "sale date",
    "datadevenda",
  ],
  valor_bruto: [
    "valor",
    "value",
    "bruto",
    "faturamento",
    "receita",
    "total",
    "preco",
    "price",
    "gross",
    "valor bruto",
    "valor_bruto",
  ],
  custo_total: [
    "custo",
    "cost",
    "custo_total",
    "cogs",
    "despesa",
    "custo total",
  ],
  categoria: [
    "categoria",
    "category",
    "tipo",
    "type",
    "setor",
    "grupo",
    "segmento",
  ],
  produto_nome: [
    "produto",
    "product",
    "item",
    "descricao",
    "description",
    "nome",
    "product name",
    "nome produto",
  ],
  quantidade: [
    "qtd",
    "qty",
    "quantidade",
    "quantity",
    "qtde",
    "quant",
    "unidades",
    "units",
  ],
  external_id: [
    "id",
    "codigo",
    "code",
    "sku",
    "external_id",
    "sale_id",
    "pedido",
    "order",
  ],
};

interface NormalizedColumn {
  original: string;
  normalized: string;
}

function normalizeColumns(columns: string[]): NormalizedColumn[] {
  return columns.map((column) => ({
    original: column,
    normalized: column
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_\-]+/g, " ")
      .trim(),
  }));
}

function buildBigrams(value: string): Set<string> {
  const bigrams = new Set<string>();

  for (let index = 0; index < value.length - 1; index++) {
    bigrams.add(value.slice(index, index + 2));
  }

  return bigrams;
}

function calculateStringSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  let intersectionCount = 0;

  leftBigrams.forEach((bigram) => {
    if (rightBigrams.has(bigram)) {
      intersectionCount++;
    }
  });

  return (2 * intersectionCount) / (leftBigrams.size + rightBigrams.size);
}

function findBestColumnMatch(
  normalizedColumns: NormalizedColumn[],
  aliases: string[],
): string | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const column of normalizedColumns) {
    for (const alias of aliases) {
      const similarityScore = calculateStringSimilarity(
        column.normalized,
        alias,
      );

      if (similarityScore > bestScore && similarityScore > 0.6) {
        bestScore = similarityScore;
        bestMatch = column.original;
      }
    }
  }

  return bestMatch;
}

export function buildSuggestedMapping(columns: string[]): SuggestedMapping {
  const normalizedColumns = normalizeColumns(columns);
  const suggestedMapping: SuggestedMapping = {};

  for (const [fieldName, aliases] of Object.entries(FIELD_ALIASES)) {
    suggestedMapping[fieldName] = findBestColumnMatch(
      normalizedColumns,
      aliases,
    );
  }

  return suggestedMapping;
}
