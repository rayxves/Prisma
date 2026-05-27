import { api, apiUpload } from "./api";
import type { Upload, UploadMapping } from "@/types";

export const uploadsService = {
	list() {
		return api.get<Upload[]>("/api/uploads");
	},
	getById(id: string) {
		return api.get<Upload>(`/api/uploads/${id}`);
	},
	upload(file: File) {
		const formData = new FormData();
		formData.append("file", file);
		return apiUpload<{ message: string; uploadId: string }>(
			"/api/uploads",
			formData,
		);
	},
	getMapping(id: string) {
		return api.get<UploadMapping>(`/api/uploads/${id}/mapping`);
	},
	confirmMapping(
		id: string,
		mapping: Record<string, string>,
		branchId: string,
	) {
		return api.post<{ message: string }>(`/api/uploads/${id}/mapping`, {
			mapping,
			branchId,
		});
	},
	delete(id: string) {
		return api.delete<void>(`/api/uploads/${id}`);
	},
};
