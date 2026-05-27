import { api } from "./api";
import { buildQuery } from "./dashboard.service";
import type { Anomaly, AnomalyDetail, DashboardFilters } from "@/types";

export const anomaliesService = {
	list(filters?: DashboardFilters) {
		return api.get<Anomaly[]>(`/api/anomalies${buildQuery(filters)}`);
	},
	getById(id: string) {
		return api.get<AnomalyDetail>(`/api/anomalies/${id}`);
	},
};
