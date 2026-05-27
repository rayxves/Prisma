export type UserRole = "ADMIN" | "EDITOR" | "VIEWER";

export type TenantPlan = "FREE" | "PRO" | "ENTERPRISE";

export type UploadStatus =
	| "PENDING"
	| "PROCESSING"
	| "AWAITING_MAPPING"
	| "DONE"
	| "ERROR";

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	tenantId: string;
	createdAt: string;
	updatedAt?: string;
}

export interface Tenant {
	id: string;
	name: string;
	cnpj: string;
	plan: TenantPlan;
	createdAt: string;
	updatedAt: string;
}

export interface Branch {
	id: string;
	name: string;
	city: string;
	state: string;
	monthlyGoal: number;
	createdAt: string;
}

export interface KpiData {
	totalRevenue: number;
	totalCost: number;
	netProfit: number;
	roi: number;
	profitMargin: number;
	totalSales: number;
	anomaliesCount: number;
}

export interface SalesTimelineEntry {
	currentYear: number | null;
	previousYear: number | null;
}

export interface SalesTimelineData {
	currentYear: number;
	previousYear: number;
	timeline: Record<number, SalesTimelineEntry>;
}

export interface TopProduct {
	productName: string;
	revenue: number;
	cost: number;
	netProfit: number;
	quantity: number;
	isAnchor: boolean;
}

export interface TopProductsData {
	totalProfit: number;
	products: TopProduct[];
}

export interface BranchRanking {
	branchId: string;
	name: string;
	city: string;
	state: string;
	revenue: number;
	netProfit: number;
	margin: number;
	monthlyGoal: number;
	goalAchievement: number | null;
}

export interface Projection {
	currentTotal: number;
	projectedMin: number;
	projectedMax: number;
	daysElapsed: number;
	daysInMonth: number;
	monthlyGoal: number | null;
	goalAchievement: number | null;
}

export interface Anomaly {
	id: string;
	date: string;
	branchId: string | null;
	branch?: { id: string; name: string; city?: string; state?: string } | null;
	kind?: string | null;
	deviation: string | number;
	value?: string | number | null;
	expectedValue?: string | number | null;
	hypothesis?: string | null;
	createdAt?: string;
}

export interface AnomalyDetail extends Anomaly {
	crossRoi?: Array<{
		productName?: string;
		name?: string;
		roi: string | number;
	}>;
	last7Days?: Array<{ date: string; totalSales: string | number }>;
}

export interface Upload {
	id: string;
	originalName: string;
	status: UploadStatus;
	createdAt: string;
	updatedAt: string;
	errorMessage: string | null;
}

export interface UploadMapping {
	uploadId: string;
	originalName: string;
	detectedColumns?: string[];
	suggestedMapping: Record<string, string> | null;
}

export interface DailyMetric {
	id: string;
	date: string;
	totalSales: string | number;
	roiDay: string | number;
	marginDay: string | number;
	anomaliesCount?: number;
	branchId: string | null;
	branch?: { name: string } | null;
}

export interface AuditLog {
	id: string;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	timestamp: string;
	userId: string;
	user?: { name: string; email: string } | null;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface DashboardFilters {
	branchId?: string;
	from?: string;
	to?: string;
}

export type Theme = "light" | "dark";
