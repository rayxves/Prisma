import {
  UploadFileNotFoundError,
  type ParsedUploadFile,
  type UploadFileGateway,
  type UploadRepository,
} from "../contracts/upload-engine.contracts";

export async function readUploadFileOrMarkError(
  uploadId: string,
  filename: string,
  uploadRepository: Pick<UploadRepository, "updateStatus">,
  uploadFileGateway: Pick<UploadFileGateway, "readUpload">,
): Promise<ParsedUploadFile> {
  try {
    return await uploadFileGateway.readUpload(filename);
  } catch (error) {
    if (error instanceof UploadFileNotFoundError) {
      await uploadRepository.updateStatus(uploadId, "ERROR");
      throw new Error(`Arquivo não encontrado: ${error.filePath}`);
    }

    throw error;
  }
}
