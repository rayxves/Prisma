import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  UploadFileNotFoundError,
  type ParsedUploadFile,
  type UploadFileGateway,
} from "../../../engine/application/contracts/upload-engine.contracts";

function buildUploadFilePath(filename: string): string {
  return path.resolve("uploads", filename);
}

function parseUploadFile(
  filePath: string,
): Papa.ParseResult<Record<string, string>> {
  try {
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

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Falha ao processar arquivo: ${error.message}`);
    }
    throw error;
  }
}

export function createLocalUploadFileGateway(): UploadFileGateway {
  return {
    async readUpload(filename: string): Promise<ParsedUploadFile> {
      const filePath = buildUploadFilePath(filename);

      if (!fs.existsSync(filePath)) {
        throw new UploadFileNotFoundError(filePath);
      }

      const parsedFile = parseUploadFile(filePath);

      return {
        filePath,
        rows: parsedFile.data,
        columns: parsedFile.meta.fields ?? [],
      };
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
