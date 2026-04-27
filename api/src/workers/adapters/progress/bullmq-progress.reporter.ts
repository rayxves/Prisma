import type { Job } from "bullmq";
import type { ProgressReporter } from "../../../engine/application/contracts/upload-engine.contracts";

export function createBullMqProgressReporter(job: Job): ProgressReporter {
  return {
    async update(progress: number): Promise<void> {
      await job.updateProgress(progress);
    },
  };
}
