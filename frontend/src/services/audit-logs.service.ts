import { api } from "./api";
import type { AuditLog, PaginatedResponse } from "@/types";

export interface AuditLogFilters {
	userId?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
}

export const auditLogsService = {
	list(filters?: AuditLogFilters) {
		const params = new URLSearchParams();
		if (filters?.userId) params.set("userId", filters.userId);
		if (filters?.from) params.set("from", filters.from);
		if (filters?.to) params.set("to", filters.to);
		if (filters?.page) params.set("page", String(filters.page));
		if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
		const qs = params.toString();
		return api.get<PaginatedResponse<AuditLog> | AuditLog[]>(
			`/api/audit-logs${qs ? `?${qs}` : ""}`,
		);
	},
};
