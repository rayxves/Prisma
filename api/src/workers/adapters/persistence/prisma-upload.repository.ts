import type {
  BoostedModel,
  SalesProjection,
} from "../../../engine/core/ml/sales-forecasting";
import type { SuggestedMapping } from "../../../engine/core/mapping/suggested-mapping-builder";
import type {
  UploadRecord,
  UploadRepository,
  UploadStatus,
} from "../../../engine/application/contracts/upload-engine.contracts";
import { prisma } from "../../../lib/prisma";

function toUploadRecord(upload: {
  id: string;
  filename: string;
  tenantId: string;
}): UploadRecord {
  return {
    id: upload.id,
    filename: upload.filename,
    tenantId: upload.tenantId,
  };
}

export function createPrismaUploadRepository(): UploadRepository {
  return {
    async updateStatus(uploadId: string, status: UploadStatus): Promise<void> {
      await prisma.rawUpload.update({
        where: { id: uploadId },
        data: { status },
      });
    },

    async findByIdAndTenant(
      uploadId: string,
      tenantId: string,
    ): Promise<UploadRecord | null> {
      const upload = await prisma.rawUpload.findFirst({
        where: { id: uploadId, tenantId },
      });

      return upload ? toUploadRecord(upload) : null;
    },

    async saveSuggestedMapping(
      uploadId: string,
      suggestedMapping: SuggestedMapping,
    ): Promise<void> {
      await prisma.rawUpload.update({
        where: { id: uploadId },
        data: {
          status: "AWAITING_MAPPING",
          suggestedMapping: suggestedMapping,
        },
      });
    },

    async saveModelMetadata(
      uploadId: string,
      mapping: Record<string, string>,
      model: BoostedModel,
      projections: SalesProjection[],
    ): Promise<void> {
      const modelMetadata: Record<string, unknown> = {
        ...mapping,
        _mlModel: {
          rmse: model.rmse,
          r2: model.r2,
          featuresUsed: model.featuresUsed,
          trainedAt: model.trainedAt,
        },
        _projections: projections.slice(0, 7),
      };

      await prisma.rawUpload.update({
        where: { id: uploadId },
        data: {
          mapping: modelMetadata,
        },
      });
    },
  };
}
