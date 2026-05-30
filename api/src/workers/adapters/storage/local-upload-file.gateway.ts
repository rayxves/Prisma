import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import {
  UploadFileNotFoundError,
  type ParsedUploadFile,
  type UploadFileGateway,
} from "../../../engine/application/contracts/upload-engine.contracts";

function buildUploadFilePath(filename: string): string {
  return path.resolve("uploads", filename);
}

function parseCsv(filePath: string): { rows: Record<string, string>[]; columns: string[] } {
  const fileContents = fs.readFileSync(filePath, "utf-8");

  const result = Papa.parse<Record<string, string>>(fileContents, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(
      `Erro ao fazer parser do CSV: ${result.errors.map((e) => e.message).join(", ")}`,
    );
  }

  return {
    rows: result.data,
    columns: result.meta.fields ?? [],
  };
}

async function parseExcel(filePath: string): Promise<{ rows: Record<string, string>[]; columns: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Planilha Excel vazia ou sem abas.");

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? "").trim()));

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell((cell, colIdx) => {
      const header = headers[colIdx - 1];
      if (!header) return;
      const val = cell.value;
      obj[header] = val instanceof Date
        ? val.toISOString().split("T")[0]!
        : String(val ?? "");
    });
    if (Object.keys(obj).length > 0) rows.push(obj);
  });

  return { rows, columns: headers };
}

export function createLocalUploadFileGateway(): UploadFileGateway {
  return {
    async readUpload(filename: string): Promise<ParsedUploadFile> {
      const filePath = buildUploadFilePath(filename);

      if (!fs.existsSync(filePath)) {
        throw new UploadFileNotFoundError(filePath);
      }

      const ext = path.extname(filename).toLowerCase();

      try {
        const { rows, columns } = ext === ".csv"
          ? parseCsv(filePath)
          : await parseExcel(filePath);

        return { filePath, rows, columns };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Falha ao processar arquivo: ${error.message}`);
        }
        throw error;
      }
    },

    async deleteUpload(filePath: string): Promise<void> {
      try {
        fs.unlinkSync(filePath);
      } catch {
        return;
      }
    },
  };
}
