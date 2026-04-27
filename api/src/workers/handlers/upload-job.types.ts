export type UploadJobData = {
  uploadId: string;
  tenantId: string;
};

export type InsertDataJobData = UploadJobData & {
  mapping: Record<string, string>;
};
