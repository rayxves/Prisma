import { apiDownload } from "./api";
import { buildQuery } from "./dashboard.service";
import type { DashboardFilters } from "@/types";

export const reportsService = {
	async downloadPdf(filters?: DashboardFilters) {
		const blob = await apiDownload(`/api/reports/pdf${buildQuery(filters)}`);
		triggerDownload(blob, "prisma-report.pdf");
	},
	async downloadExcel(filters?: DashboardFilters) {
		const blob = await apiDownload(`/api/reports/excel${buildQuery(filters)}`);
		triggerDownload(blob, "prisma-report.xlsx");
	},
};

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
