import { api } from "./api";
import { buildQuery } from "./dashboard.service";
import type { DailyMetric, DashboardFilters } from "@/types";

export const metricsService = {
	daily(filters?: DashboardFilters) {
		return api.get<DailyMetric[]>(`/api/metrics/daily${buildQuery(filters)}`);
	},
};
