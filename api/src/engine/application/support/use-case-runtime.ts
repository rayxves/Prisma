import type {
  ProgressReporter,
  UploadPipelineObserver,
  UseCaseRuntime,
} from "../contracts/upload-engine.contracts";

const noopProgressReporter: ProgressReporter = {
  async update(): Promise<void> {
    return;
  },
};

const noopObserver: UploadPipelineObserver = {};

export function getProgressReporter(
  runtime?: UseCaseRuntime,
): ProgressReporter {
  return runtime?.progressReporter ?? noopProgressReporter;
}

export function getPipelineObserver(
  runtime?: UseCaseRuntime,
): UploadPipelineObserver {
  return runtime?.observer ?? noopObserver;
}
