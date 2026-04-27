export interface RawRow {
  [key: string]: string | number | null | undefined;
}

export interface CleanRow {
  external_id: string;
  data_venda: Date;
  valor_bruto: number;
  custo_total: number;
  categoria: string;
  produto_nome: string;
  quantidade: number;
}

export interface CleanResult {
  rows: CleanRow[];
  discarded: number;
  imputedNulls: number;
  outliersCapped: number;
  warnings: string[];
}

interface ParsedRow {
  external_id: string;
  data_venda: Date | null;
  valor_bruto: number | null;
  custo_total: number | null;
  categoria: string;
  produto_nome: string;
  quantidade: number | null;
}

type NumericParsedField = "valor_bruto" | "custo_total";

const DEFAULT_CATEGORY = "sem_categoria";
const GENERATED_EXTERNAL_ID_PREFIX = "auto-";
const DEFAULT_COST_RATIO = 0.7;
const DEFAULT_QUANTITY = 1;
const MAX_WARNING_MESSAGES = 10;
const EXCEL_SERIAL_MIN = 40000;
const EXCEL_SERIAL_MAX = 50000;

function parseDate(rawValue: string | number | null | undefined): Date | null {
  if (!rawValue) {
    return null;
  }

  const normalizedValue = String(rawValue).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(normalizedValue)) {
    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const brazilianDateMatch = normalizedValue.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  );

  if (brazilianDateMatch) {
    const [, day, month, year] = brazilianDateMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const excelSerialNumber = Number(normalizedValue);

  if (
    !Number.isNaN(excelSerialNumber) &&
    excelSerialNumber > EXCEL_SERIAL_MIN &&
    excelSerialNumber < EXCEL_SERIAL_MAX
  ) {
    const parsedDate = new Date(
      Date.UTC(1899, 11, 30) + excelSerialNumber * 86400000,
    );
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
}

function normalizeText(rawText: string | null | undefined): string {
  if (!rawText) {
    return "";
  }

  return rawText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(rawValue: string | number | null | undefined): number | null {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  const normalizedValue = String(rawValue)
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(?:[,\.]|$))/g, "")
    .replace(",", ".");
  const parsedNumber = parseFloat(normalizedValue);

  return Number.isNaN(parsedNumber) ? null : parsedNumber;
}

function calculateQuartiles(values: number[]): {
  q1: number;
  q3: number;
  iqr: number;
} {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const lowerHalf = sortedValues.slice(0, middleIndex);
  const upperHalf = sortedValues.slice(
    sortedValues.length % 2 === 0 ? middleIndex : middleIndex + 1,
  );
  const q1 = lowerHalf[Math.floor(lowerHalf.length / 2)] ?? 0;
  const q3 = upperHalf[Math.floor(upperHalf.length / 2)] ?? 0;

  return { q1, q3, iqr: q3 - q1 };
}

function createEmptyCleanResult(): CleanResult {
  return {
    rows: [],
    discarded: 0,
    imputedNulls: 0,
    outliersCapped: 0,
    warnings: [],
  };
}

function createFieldReader(rawRow: RawRow, mapping: Record<string, string>) {
  return (fieldName: string) => rawRow[mapping[fieldName] ?? fieldName];
}

function generateExternalId(
  rawValue: string | number | null | undefined,
  rowIndex: number,
): string {
  return rawValue
    ? String(rawValue).trim()
    : `${GENERATED_EXTERNAL_ID_PREFIX}${rowIndex + 1}`;
}

function shouldDiscardRow(parsedRow: ParsedRow): boolean {
  return (
    !parsedRow.data_venda ||
    parsedRow.valor_bruto === null ||
    !parsedRow.produto_nome
  );
}

function addDiscardWarning(
  result: CleanResult,
  sourceRowIndex: number,
  readField: ReturnType<typeof createFieldReader>,
): void {
  if (result.warnings.length >= MAX_WARNING_MESSAGES) {
    return;
  }

  result.warnings.push(
    `Linha ${sourceRowIndex + 2}: descartada — data_venda=${readField("data_venda")}, valor_bruto=${readField("valor_bruto")}, produto=${readField("produto_nome")}`,
  );
}

function applyDefaultCost(parsedRow: ParsedRow, result: CleanResult): number {
  if (parsedRow.custo_total !== null) {
    return parsedRow.custo_total;
  }

  result.imputedNulls++;
  return (parsedRow.valor_bruto as number) * DEFAULT_COST_RATIO;
}

function applyDefaultQuantity(
  parsedRow: ParsedRow,
  result: CleanResult,
): number {
  if (parsedRow.quantidade !== null && parsedRow.quantidade > 0) {
    return parsedRow.quantidade;
  }

  result.imputedNulls++;
  return DEFAULT_QUANTITY;
}

function parseMappedRow(
  rawRow: RawRow,
  rowIndex: number,
  mapping: Record<string, string>,
  result: CleanResult,
): ParsedRow | null {
  const readField = createFieldReader(rawRow, mapping);

  const parsedRow: ParsedRow = {
    external_id: generateExternalId(readField("external_id"), rowIndex),
    data_venda: parseDate(readField("data_venda")),
    valor_bruto: toNumber(readField("valor_bruto")),
    custo_total: toNumber(readField("custo_total")),
    categoria: normalizeText(
      String(readField("categoria") ?? DEFAULT_CATEGORY),
    ),
    produto_nome: normalizeText(String(readField("produto_nome") ?? "")),
    quantidade: toNumber(readField("quantidade")),
  };

  if (shouldDiscardRow(parsedRow)) {
    result.discarded++;
    addDiscardWarning(result, rowIndex, readField);
    return null;
  }

  return {
    ...parsedRow,
    custo_total: applyDefaultCost(parsedRow, result),
    quantidade: applyDefaultQuantity(parsedRow, result),
  };
}

function capOutliers(
  parsedRows: ParsedRow[],
  fieldName: NumericParsedField,
  result: CleanResult,
): void {
  const fieldValues = parsedRows.map(
    (parsedRow) => parsedRow[fieldName] as number,
  );
  const { q1, q3, iqr } = calculateQuartiles(fieldValues);
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  parsedRows.forEach((parsedRow) => {
    const currentValue = parsedRow[fieldName] as number;

    if (currentValue < lowerFence) {
      parsedRow[fieldName] = lowerFence > 0 ? lowerFence : 0;
      result.outliersCapped++;
      return;
    }

    if (currentValue > upperFence) {
      parsedRow[fieldName] = upperFence;
      result.outliersCapped++;
    }
  });
}

function normalizeCosts(parsedRows: ParsedRow[], result: CleanResult): void {
  parsedRows.forEach((parsedRow) => {
    if (
      parsedRow.custo_total !== null &&
      parsedRow.valor_bruto !== null &&
      parsedRow.custo_total > parsedRow.valor_bruto
    ) {
      parsedRow.custo_total = parsedRow.valor_bruto * 0.9;
      result.imputedNulls++;
    }
  });
}

function buildCategoryCodeMap(rows: CleanRow[]): Map<string, number> {
  const uniqueCategories = [
    ...new Set(rows.map((row) => row.categoria)),
  ].sort();
  return new Map(uniqueCategories.map((category, index) => [category, index]));
}

function encodeRowForMachineLearning(
  row: CleanRow,
  categoryCodeMap: Map<string, number>,
): EncodedRow {
  return {
    dayOfWeek: row.data_venda.getDay(),
    monthOfYear: row.data_venda.getMonth() + 1,
    categoriaCode: categoryCodeMap.get(row.categoria) ?? 0,
    valor_bruto: row.valor_bruto,
    custo_total: row.custo_total,
    quantidade: row.quantidade,
    margem:
      row.valor_bruto > 0
        ? (row.valor_bruto - row.custo_total) / row.valor_bruto
        : 0,
  };
}

export function cleanRows(
  rawRows: RawRow[],
  mapping: Record<string, string>,
): CleanResult {
  const result = createEmptyCleanResult();
  const parsedRows = rawRows
    .map((rawRow, rowIndex) =>
      parseMappedRow(rawRow, rowIndex, mapping, result),
    )
    .filter((parsedRow): parsedRow is ParsedRow => parsedRow !== null);

  if (parsedRows.length === 0) {
    result.warnings.push("Nenhuma linha válida encontrada após limpeza.");
    return result;
  }

  capOutliers(parsedRows, "valor_bruto", result);
  capOutliers(parsedRows, "custo_total", result);
  normalizeCosts(parsedRows, result);

  result.rows = parsedRows as CleanRow[];
  return result;
}

export interface EncodedRow {
  dayOfWeek: number;
  monthOfYear: number;
  categoriaCode: number;
  valor_bruto: number;
  custo_total: number;
  quantidade: number;
  margem: number;
}

export function encodeForML(rows: CleanRow[]): {
  encoded: EncodedRow[];
  categoriaMap: Map<string, number>;
} {
  const categoriaMap = buildCategoryCodeMap(rows);
  const encoded = rows.map((row) =>
    encodeRowForMachineLearning(row, categoriaMap),
  );

  return { encoded, categoriaMap };
}
