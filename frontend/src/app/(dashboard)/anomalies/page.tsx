"use client";

import { useEffect, useMemo, useState } from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Drawer } from "@/components/ui/Drawer/Drawer";
import { Select } from "@/components/ui/Select/Select";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { anomaliesService } from "@/services/anomalies.service";
import { branchesService } from "@/services/branches.service";
import { useToast } from "@/hooks/useToast";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { formatBRL, formatDate, formatPercent } from "@/services/format";
import type { Anomaly, AnomalyDetail, Branch } from "@/types";
import styles from "./anomalies.module.css";

type Severity = "high" | "mid" | "low";

function deviationOf(a: Anomaly): number {
	return Math.abs(Number(a.deviation ?? 0));
}

function severityOf(a: Anomaly): Severity {
	const d = deviationOf(a);
	if (d >= 20) return "high";
	if (d >= 10) return "mid";
	return "low";
}

function severityChip(s: Severity) {
	if (s === "high") {
		return (
			<span className={`${styles.severityChip} ${styles.severityHigh}`}>
				<ErrorIcon fontSize="inherit" /> Crítica
			</span>
		);
	}
	if (s === "mid") {
		return (
			<span className={`${styles.severityChip} ${styles.severityMid}`}>
				<WarningAmberIcon fontSize="inherit" /> Atenção
			</span>
		);
	}
	return (
		<span className={`${styles.severityChip} ${styles.severityLow}`}>
			<InfoOutlinedIcon fontSize="inherit" /> Leve
		</span>
	);
}

export default function AnomaliesPage() {
	const toast = useToast();
	const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
	const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [loading, setLoading] = useState(true);
	const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");

	const [openId, setOpenId] = useState<string | null>(null);
	const [detail, setDetail] = useState<AnomalyDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);

	useEffect(() => {
		branchesService
			.list()
			.then(setBranches)
			.catch(() => {});
	}, []);

	useEffect(() => {
		setLoading(true);
		anomaliesService
			.list({ ...(selectedBranchId ? { branchId: selectedBranchId } : {}) })
			.then(setAnomalies)
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar anomalias",
				),
			)
			.finally(() => setLoading(false));
	}, [selectedBranchId]);

	useEffect(() => {
		if (!openId) {
			setDetail(null);
			return;
		}
		setDetailLoading(true);
		anomaliesService
			.getById(openId)
			.then(setDetail)
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar detalhes",
				),
			)
			.finally(() => setDetailLoading(false));
	}, [openId]);

	const filtered = useMemo(() => {
		if (severityFilter === "all") return anomalies;
		return anomalies.filter((a) => severityOf(a) === severityFilter);
	}, [anomalies, severityFilter]);

	function rowClass(a: Anomaly): string {
		const s = severityOf(a);
		if (s === "high") return styles.severityRowHigh;
		if (s === "mid") return styles.severityRowMid;
		return "";
	}

	const columns: Column<Anomaly>[] = [
		{
			key: "date",
			header: "Data",
			render: (row) => (
				<span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
					{formatDate(row.date)}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.date,
		},
		{
			key: "branch",
			header: "Filial",
			render: (row) => row.branch?.name ?? "—",
			sortable: true,
			sortValue: (r) => r.branch?.name ?? "",
		},
		{
			key: "kind",
			header: "Tipo",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 11,
						textTransform: "uppercase",
						letterSpacing: "0.06em",
						color: "var(--color-text-secondary)",
					}}>
					{row.kind ?? "—"}
				</span>
			),
		},
		{
			key: "deviation",
			header: "Desvio",
			align: "right",
			render: (row) => {
				const dev = Number(row.deviation ?? 0);
				const positive = dev >= 0;
				return (
					<span
						className={styles.severityCell}
						style={{
							color:
								Math.abs(dev) >= 10
									? "var(--color-error)"
									: "var(--color-text-primary)",
							justifyContent: "flex-end",
						}}>
						{positive ? "↑" : "↓"} {formatPercent(Math.abs(dev))}
					</span>
				);
			},
			sortable: true,
			sortValue: (r) => Math.abs(Number(r.deviation ?? 0)),
		},
		{
			key: "severity",
			header: "Gravidade",
			render: (row) => severityChip(severityOf(row)),
			sortable: true,
			sortValue: (r) => deviationOf(r),
		},
	];

	function buildSparkline(d: AnomalyDetail) {
		if (!d.last7Days || d.last7Days.length === 0) return null;
		return d.last7Days.map((p) => ({
			date: p.date.slice(5),
			value: Number(p.totalSales ?? 0),
		}));
	}

	return (
		<div>
			<PageHeader
				eyebrow="Detecção"
				title="Anomalias"
				description="Desvios estatísticos identificados em vendas, lucro e ROI. Clique em uma linha para ver a hipótese gerada."
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
				<div className={styles.filterField}>
					<Select
						value={severityFilter}
						onChange={(e) =>
							setSeverityFilter(e.target.value as "all" | Severity)
						}
						options={[
							{ value: "all", label: "Todas as gravidades" },
							{ value: "high", label: "Críticas (≥ 20%)" },
							{ value: "mid", label: "Atenção (10-20%)" },
							{ value: "low", label: "Leves (< 10%)" },
						]}
					/>
				</div>
			</div>

			<Card>
				<Table
					columns={columns.map((c) => ({
						...c,
						render: (row: Anomaly) => (
							<div
								onClick={() => setOpenId(row.id)}
								style={{ cursor: "pointer" }}
								className={rowClass(row)}>
								{c.render(row)}
							</div>
						),
					}))}
					rows={filtered}
					rowKey={(r) => r.id}
					loading={loading}
					emptyTitle="Nenhuma anomalia detectada"
					emptyDescription="Quando o sistema detectar desvios estatísticos, eles aparecerão aqui."
					emptyIcon={<WarningAmberIcon fontSize="medium" />}
				/>
			</Card>

			<Drawer
				open={Boolean(openId)}
				onClose={() => setOpenId(null)}
				title="Detalhe da anomalia"
				subtitle={
					detail
						? `${detail.branch?.name ?? "—"} · ${formatDate(detail.date)}`
						: undefined
				}>
				{detailLoading ? (
					<div
						style={{ display: "flex", justifyContent: "center", padding: 32 }}>
						<Spinner size="md" />
					</div>
				) : detail ? (
					<>
						<div style={{ marginBottom: 20 }}>
							{severityChip(severityOf(detail))}
						</div>

						<div className={styles.detailMeta}>
							<div>
								<div className={styles.detailLabel}>Tipo</div>
								<div className={styles.detailValue}>{detail.kind ?? "—"}</div>
							</div>
							<div>
								<div className={styles.detailLabel}>Desvio</div>
								<div className={styles.detailValue}>
									{formatPercent(Math.abs(Number(detail.deviation ?? 0)))}
								</div>
							</div>
							<div>
								<div className={styles.detailLabel}>Valor observado</div>
								<div className={styles.detailValue}>
									{formatBRL(Number(detail.value ?? 0))}
								</div>
							</div>
							<div>
								<div className={styles.detailLabel}>Valor esperado</div>
								<div className={styles.detailValue}>
									{formatBRL(Number(detail.expectedValue ?? 0))}
								</div>
							</div>
						</div>

						{detail.hypothesis ? (
							<>
								<div
									className={styles.detailLabel}
									style={{ marginBottom: 8 }}>
									<LightbulbIcon
										fontSize="inherit"
										style={{ verticalAlign: "middle" }}
									/>{" "}
									Hipótese gerada
								</div>
								<blockquote className={styles.hypothesis}>
									{detail.hypothesis}
								</blockquote>
							</>
						) : null}

						{detail.crossRoi && detail.crossRoi.length > 0 ? (
							<div className={styles.crossroi}>
								<div className={styles.crossroiTitle}>
									ROI cruzado — produtos relacionados
								</div>
								<div className={styles.crossroiGrid}>
									{detail.crossRoi.slice(0, 5).map((c, idx) => (
										<div
											key={idx}
											className={styles.crossroiRow}>
											<span className={styles.crossroiName}>
												{c.productName ?? c.name ?? "—"}
											</span>
											<span className={styles.crossroiValue}>
												{formatPercent(Number(c.roi ?? 0))}
											</span>
										</div>
									))}
								</div>
							</div>
						) : null}

						{detail.last7Days && detail.last7Days.length > 0 ? (
							<div>
								<div className={styles.crossroiTitle}>Últimos 7 dias</div>
								<div className={styles.sparkline}>
									<ResponsiveContainer
										width="100%"
										height="100%">
										<LineChart data={buildSparkline(detail) ?? []}>
											<Tooltip
												contentStyle={{
													background: "var(--color-surface)",
													border: "1px solid var(--color-border)",
													fontSize: 11,
												}}
												formatter={(v: number) => formatBRL(v)}
											/>
											<Line
												type="monotone"
												dataKey="value"
												stroke="var(--color-primary)"
												strokeWidth={2}
												dot={{ r: 3, fill: "var(--color-primary)" }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							</div>
						) : null}
					</>
				) : (
					<div style={{ color: "var(--color-text-muted)" }}>
						Selecione uma anomalia para ver detalhes.
					</div>
				)}
			</Drawer>
		</div>
	);
}
