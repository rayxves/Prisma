import { api } from "./api";
import type {
	BranchRanking,
	DashboardFilters,
	KpiData,
	Projection,
	SalesTimelineData,
	TopProductsData,
} from "@/types";

function buildQuery(filters?: DashboardFilters): string {
	if (!filters) return "";
	const params = new URLSearchParams();
	if (filters.branchId) params.set("branchId", filters.branchId);
	if (filters.from) params.set("from", filters.from);
	if (filters.to) params.set("to", filters.to);
	const qs = params.toString();
	return qs ? `?${qs}` : "";
}

export const dashboardService = {
	kpis(filters?: DashboardFilters) {
		return api.get<KpiData>(`/api/dashboard/kpis${buildQuery(filters)}`);
	},
	salesTimeline(filters?: DashboardFilters) {
		return api.get<SalesTimelineData>(
			`/api/dashboard/sales-timeline${buildQuery(filters)}`,
		);
	},
	topProducts(filters?: DashboardFilters) {
		return api.get<TopProductsData>(
			`/api/dashboard/top-products${buildQuery(filters)}`,
		);
	},
	branchesRanking(filters?: DashboardFilters) {
		return api.get<BranchRanking[]>(
			`/api/dashboard/branches-ranking${buildQuery(filters)}`,
		);
	},
	projection(filters?: DashboardFilters) {
		return api.get<Projection>(
			`/api/dashboard/projection${buildQuery(filters)}`,
		);
	},
};

export { buildQuery };
