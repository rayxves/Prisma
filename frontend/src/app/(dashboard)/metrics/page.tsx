"use client";

import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Button } from "@/components/ui/Button/Button";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Select } from "@/components/ui/Select/Select";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Table, type Column } from "@/components/ui/Table/Table";
import { metricsService } from "@/services/metrics.service";
import { anomaliesService } from "@/services/anomalies.service";
import { branchesService } from "@/services/branches.service";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useToast } from "@/hooks/useToast";
import {
	formatBRL,
	formatBRLCompact,
	formatDate,
	formatPercent,
} from "@/services/format";
import type { Anomaly, Branch, DailyMetric } from "@/types";
import styles from "./metrics.module.css";

const PAGE_SIZE = 15;

type Metric = "revenue" | "roi" | "margin";

const METRIC_CONFIG: Record<
	Metric,
	{ label: string; color: string; format: (v: number) => string }
> = {
	revenue: {
		label: "Total Vendas",
		color: "var(--color-primary)",
		format: formatBRL,
	},
	roi: {
		label: "ROI Dia",
		color: "var(--color-primary-light)",
		format: (v) => formatPercent(v),
	},
	margin: {
		label: "Margem Dia",
		color: "#d97706",
		format: (v) => formatPercent(v),
	},
};

function isoToday() {
	return new Date().toISOString().split("T")[0];
}

function isoDaysAgo(days: number) {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString().split("T")[0];
}

export default function MetricsPage() {
	const toast = useToast();
	const { selectedBranchId, setSelectedBranchId } = useBranchFilter();

	const [from, setFrom] = useState(isoDaysAgo(30));
	const [to, setTo] = useState(isoToday());
	const [metric, setMetric] = useState<Metric>("revenue");

	const [metrics, setMetrics] = useState<DailyMetric[]>([]);
	const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

	useEffect(() => {
		branchesService
			.list()
			.then(setBranches)
			.catch(() => {});
	}, []);

	useEffect(() => {
		setLoading(true);
		const fromIso = new Date(from).toISOString();
		const toIso = new Date(`${to}T23:59:59`).toISOString();
		Promise.all([
			metricsService.daily({
				...(selectedBranchId ? { branchId: selectedBranchId } : {}),
				from: fromIso,
				to: toIso,
			}),
			anomaliesService.list({
				...(selectedBranchId ? { branchId: selectedBranchId } : {}),
				from: fromIso,
				to: toIso,
			}),
		])
			.then(([m, a]) => {
				setMetrics(m);
				setAnomalies(a);
				setPage(1);
			})
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar métricas",
				),
			)
			.finally(() => setLoading(false));
	}, [from, to, selectedBranchId]);

	const anomalyDates = useMemo(
		() => new Set(anomalies.map((a) => a.date.split("T")[0])),
		[anomalies],
	);

	const chartData = useMemo(() => {
		return [...metrics]
			.sort((a, b) => a.date.localeCompare(b.date))
			.map((m) => {
				const dateOnly = m.date.split("T")[0];
				return {
					date: dateOnly.slice(5),
					fullDate: m.date,
					revenue: Number(m.totalSales ?? 0),
					roi: Number(m.roiDay ?? 0),
					margin: Number(m.marginDay ?? 0),
					hasAnomaly: anomalyDates.has(dateOnly),
				};
			});
	}, [metrics, anomalyDates]);

	const columns: Column<DailyMetric>[] = [
		{
			key: "date",
			header: "Data",
			render: (row) => {
				const dateOnly = row.date.split("T")[0];
				const hasAnomaly = anomalyDates.has(dateOnly);
				return (
					<span
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 12,
							display: "inline-flex",
							alignItems: "center",
						}}>
						{hasAnomaly ? (
							<span
								className={styles.anomalyMarker}
								title="Anomalia detectada"
							/>
						) : null}
						{formatDate(row.date)}
					</span>
				);
			},
			sortable: true,
			sortValue: (r) => r.date,
		},
		{
			key: "totalSales",
			header: "Vendas",
			align: "right",
			render: (row) => (
				<span style={{ fontFamily: "var(--font-mono)" }}>
					{formatBRL(Number(row.totalSales ?? 0))}
				</span>
			),
			sortable: true,
			sortValue: (r) => Number(r.totalSales ?? 0),
		},
		{
			key: "roiDay",
			header: "ROI",
			align: "right",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						color:
							Number(row.roiDay ?? 0) < 0
								? "var(--color-error)"
								: "var(--color-primary)",
					}}>
					{formatPercent(Number(row.roiDay ?? 0))}
				</span>
			),
			sortable: true,
			sortValue: (r) => Number(r.roiDay ?? 0),
		},
		{
			key: "marginDay",
			header: "Margem",
			align: "right",
			render: (row) => (
				<span style={{ fontFamily: "var(--font-mono)" }}>
					{formatPercent(Number(row.marginDay ?? 0))}
				</span>
			),
			sortable: true,
			sortValue: (r) => Number(r.marginDay ?? 0),
		},
	];

	const cfg = METRIC_CONFIG[metric];

	return (
		<div>
			<PageHeader
				eyebrow="Série temporal"
				title="Métricas diárias"
				description="Acompanhe a evolução de vendas, ROI e margem dia a dia. Pontos com anomalia detectada são destacados em vermelho."
			/>

			<div className={styles.toolbar}>
				<div className={styles.filterField}>
					<Select
						placeholder="Todas as filiais"
						value={selectedBranchId ?? ""}
						onChange={(e) => setSelectedBranchId(e.target.value || null)}
						options={[
							{ value: "", label: "Todas as filiais" },
							...branches.map((b) => ({ value: b.id, label: b.name })),
						]}
					/>
				</div>

				<DatePicker
					label="De"
					value={from}
					max={to}
					onChange={setFrom}
				/>
				<DatePicker
					label="Até"
					value={to}
					min={from}
					max={isoToday()}
					onChange={setTo}
				/>

				<div
					className={styles.toggleGroup}
					role="tablist"
					aria-label="Métrica">
					{(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
						<button
							key={m}
							type="button"
							role="tab"
							aria-selected={metric === m}
							className={[
								styles.toggleBtn,
								metric === m ? styles.toggleBtnActive : "",
							]
								.filter(Boolean)
								.join(" ")}
							onClick={() => setMetric(m)}>
							{METRIC_CONFIG[m].label}
						</button>
					))}
				</div>
			</div>

			<Card
				title={cfg.label}
				subtitle={`${formatDate(from)} → ${formatDate(to)}`}>
				<div className={styles.chartWrap}>
					{loading ? (
						<div
							style={{
								height: 320,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--color-text-muted)",
							}}>
							Carregando série...
						</div>
					) : chartData.length === 0 ? (
						<div
							style={{
								height: 320,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--color-text-muted)",
							}}>
							Sem dados para o período selecionado
						</div>
					) : (
						<ResponsiveContainer
							width="100%"
							height={320}>
							<LineChart
								data={chartData}
								margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
								<CartesianGrid
									stroke="var(--color-border)"
									vertical={false}
									strokeDasharray="3 3"
								/>
								<XAxis
									dataKey="date"
									tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
									axisLine={{ stroke: "var(--color-border)" }}
									tickLine={false}
								/>
								<YAxis
									tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(v) =>
										metric === "revenue"
											? formatBRLCompact(v)
											: `${v.toFixed(0)}%`
									}
									width={70}
								/>
								<Tooltip
									contentStyle={{
										background: "var(--color-surface)",
										border: "1px solid var(--color-border)",
										borderRadius: "var(--radius-md)",
										fontSize: 12,
									}}
									formatter={(v: number) => cfg.format(v)}
								/>
								<Legend
									wrapperStyle={{
										fontSize: 12,
										color: "var(--color-text-secondary)",
									}}
								/>
								<Line
									type="monotone"
									dataKey={metric}
									name={cfg.label}
									stroke={cfg.color}
									strokeWidth={2.5}
									dot={(props: {
										cx?: number;
										cy?: number;
										payload?: { hasAnomaly?: boolean };
									}) => {
										const { cx, cy, payload } = props;
										if (cx === undefined || cy === undefined) {
											return (
												<circle
													cx={0}
													cy={0}
													r={0}
													fill="transparent"
												/>
											);
										}
										if (payload?.hasAnomaly) {
											return (
												<circle
													cx={cx}
													cy={cy}
													r={5}
													fill="var(--color-error)"
													stroke="var(--color-surface)"
													strokeWidth={2}
												/>
											);
										}
										return (
											<circle
												cx={cx}
												cy={cy}
												r={3}
												fill={cfg.color}
											/>
										);
									}}
									activeDot={{ r: 6 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					)}
				</div>

				<div className={styles.tableNote}>
					<span className={styles.anomalyMarker} /> dias com anomalia detectada
				</div>

				<Table
					columns={columns}
					rows={metrics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
					rowKey={(r) => `${r.branchId ?? "tenant"}-${r.date}`}
					loading={loading}
					emptyTitle="Sem métricas no período"
					emptyDescription="Selecione um intervalo onde existam vendas registradas."
				/>
				{metrics.length > PAGE_SIZE ? (
					<div className={styles.pagination}>
						<span className={styles.paginationInfo}>
							{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, metrics.length)} de {metrics.length}
						</span>
						<div className={styles.paginationBtns}>
							<Button
								size="sm"
								variant="ghost"
								disabled={page <= 1 || loading}
								leftIcon={<ChevronLeftIcon fontSize="small" />}
								onClick={() => setPage((p) => Math.max(1, p - 1))}>
								Anterior
							</Button>
							<Button
								size="sm"
								variant="ghost"
								disabled={page * PAGE_SIZE >= metrics.length || loading}
								rightIcon={<ChevronRightIcon fontSize="small" />}
								onClick={() => setPage((p) => p + 1)}>
								Próxima
							</Button>
						</div>
					</div>
				) : null}
			</Card>
		</div>
	);
}
