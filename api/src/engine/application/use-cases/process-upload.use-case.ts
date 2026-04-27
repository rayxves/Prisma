import { buildSuggestedMapping } from "../../core/mapping/suggested-mapping-builder";
import type {
  ProcessUploadInput,
  ProcessUploadResult,
  UploadFileGateway,
  UploadRepository,
  UseCaseRuntime,
} from "../contracts/upload-engine.contracts";
import { readUploadFileOrMarkError } from "../support/load-upload-file";
import { getProgressReporter } from "../support/use-case-runtime";

const PROCESS_UPLOAD_COMPLETED_PROGRESS = 100;

interface ProcessUploadDependencies {
  uploadRepository: UploadRepository;
  uploadFileGateway: Pick<UploadFileGateway, "readUpload">;
}

export function createProcessUploadUseCase(
  dependencies: ProcessUploadDependencies,
) {
  return async function processUpload(
    input: ProcessUploadInput,
    runtime?: UseCaseRuntime,
  ): Promise<ProcessUploadResult> {
    const progressReporter = getProgressReporter(runtime);

    await dependencies.uploadRepository.updateStatus(
      input.uploadId,
      "PROCESSING",
    );

    const upload = await dependencies.uploadRepository.findByIdAndTenant(
      input.uploadId,
      input.tenantId,
    );

    if (!upload) {
      throw new Error(
        `Upload ${input.uploadId} não encontrado para tenant ${input.tenantId}`,
      );
    }

    const parsedUpload = await readUploadFileOrMarkError(
      input.uploadId,
      upload.filename,
      dependencies.uploadRepository,
      dependencies.uploadFileGateway,
    );
    const suggestedMapping = buildSuggestedMapping(parsedUpload.columns);

    await dependencies.uploadRepository.saveSuggestedMapping(
      input.uploadId,
      suggestedMapping,
    );
    await progressReporter.update(PROCESS_UPLOAD_COMPLETED_PROGRESS);

    return {
      columnCount: parsedUpload.columns.length,
    };
  };
}
