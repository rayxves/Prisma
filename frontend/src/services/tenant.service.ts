import { api } from "./api";
import type { Tenant, TenantPlan } from "@/types";

export interface UpdateTenantInput {
	name?: string;
	plan?: TenantPlan;
}

export const tenantService = {
	get() {
		return api.get<Tenant>("/api/tenant");
	},
	update(data: UpdateTenantInput) {
		return api.put<Tenant>("/api/tenant", data);
	},
};
