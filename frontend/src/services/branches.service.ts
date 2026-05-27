import { api } from "./api";
import type { Branch } from "@/types";

export interface BranchInput {
	name: string;
	city: string;
	state: string;
	monthlyGoal: number;
}

export const branchesService = {
	list() {
		return api.get<Branch[]>("/api/branches");
	},
	getById(id: string) {
		return api.get<Branch>(`/api/branches/${id}`);
	},
	create(data: BranchInput) {
		return api.post<Branch>("/api/branches", data);
	},
	update(id: string, data: Partial<BranchInput>) {
		return api.put<Branch>(`/api/branches/${id}`, data);
	},
	remove(id: string) {
		return api.delete<void>(`/api/branches/${id}`);
	},
};
