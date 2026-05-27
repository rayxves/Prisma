"use client";

import { useEffect, useMemo, useState } from "react";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PercentIcon from "@mui/icons-material/Percent";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RefreshIcon from "@mui/icons-material/Refresh";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { SalesTimelineChart } from "@/components/charts/SalesTimeline/SalesTimeline";
import { BranchesRankingChart } from "@/components/charts/BranchesRanking/BranchesRanking";
import { ParetoChart } from "@/components/charts/ParetoChart/ParetoChart";
import { dashboardService } from "@/services/dashboard.service";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { formatBRL, formatNumber, formatPercent } from "@/services/format";
import type {
	BranchRanking,
	DashboardFilters,
	KpiData,
	Projection,
	SalesTimelineData,
	TopProductsData,
} from "@/types";
import styles from "./dashboard.module.css";

type Period = "month" | "year" | "all";

function getPeriodRange(period: Period): { from?: string; to?: string } {
	const now = new Date();
	if (period === "month") {
		const from = new Date(now.getFullYear(), now.getMonth(), 1);
		return { from: from.toISOString(), to: now.toISOString() };
	}
	if (period === "year") {
		const from = new Date(now.getFullYear(), 0, 1);
		return { from: from.toISOString(), to: now.toISOString() };
	}
	return {};
}

export default function DashboardPage() {
	const { selectedBranchId } = useBranchFilter();
	const [period, setPeriod] = useState<Period>("month");

	const [kpis, setKpis] = useState<KpiData | null>(null);
	const [timeline, setTimeline] = useState<SalesTimelineData | null>(null);
	const [projection, setProjection] = useState<Projection | null>(null);
	const [ranking, setRanking] = useState<BranchRanking[] | null>(null);
	const [products, setProducts] = useState<TopProductsData | null>(null);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);

	const filters = useMemo<DashboardFilters>(() => {
		const range = getPeriodRange(period);
		return {
			...(selectedBranchId ? { branchId: selectedBranchId } : {}),
			...range,
		};
	}, [selectedBranchId, period]);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		Promise.all([
			dashboardService.kpis(filters),
			dashboardService.salesTimeline({
				...(selectedBranchId ? { branchId: selectedBranchId } : {}),
			}),
			dashboardService.projection({
				...(selectedBranchId ? { branchId: selectedBranchId } : {}),
			}),
			dashboardService.branchesRanking(filters),
			dashboardService.topProducts(filters),
		])
			.then(([k, t, p, r, tp]) => {
				if (cancelled) return;
				setKpis(k);
				setTimeline(t);
				setProjection(p);
				setRanking(r);
				setProducts(tp);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(
					err instanceof Error ? err.message : "Falha ao carregar dashboard",
				);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [filters, selectedBranchId, refreshKey]);

	return (
		<div>
			<PageHeader
				eyebrow="Visão consolidada"
				title="Dashboard"
				description="Receita, lucro e projeções em tempo real. Filtros aplicados afetam toda a página."
				actions={
					<Button
						variant="secondary"
						size="sm"
						leftIcon={<RefreshIcon fontSize="small" />}
						onClick={() => setRefreshKey((k) => k + 1)}>
						Atualizar
					</Button>
				}
			/>

			<div
				className={styles.filters}
				role="tablist"
				aria-label="Período">
				{(["month", "year", "all"] as Period[]).map((p) => (
					<button
						key={p}
						type="button"
						role="tab"
						aria-selected={period === p}
						className={[
							styles.filterChip,
							period === p ? styles.filterChipActive : "",
						]
							.filter(Boolean)
							.join(" ")}
						onClick={() => setPeriod(p)}>
						{p === "month"
							? "Este mês"
							: p === "year"
								? "Este ano"
								: "Todo o período"}
					</button>
				))}
			</div>

			{error ? (
				<div className={styles.error}>
					{error}
					<div style={{ marginTop: 12 }}>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setRefreshKey((k) => k + 1)}>
							Tentar novamente
						</Button>
					</div>
				</div>
			) : null}

			<div className={styles.grid}>
				<KpiCard
					label="Receita Total"
					value={kpis ? formatBRL(kpis.totalRevenue) : null}
					icon={<AttachMoneyIcon fontSize="small" />}
					loading={loading}
				/>
				<KpiCard
					label="Lucro Líquido"
					value={kpis ? formatBRL(kpis.netProfit) : null}
					valueClass={
						kpis && kpis.netProfit < 0 ? styles.kpiValueNegative : undefined
					}
					icon={
						kpis && kpis.netProfit < 0 ? (
							<TrendingDownIcon fontSize="small" />
						) : (
							<TrendingUpIcon fontSize="small" />
						)
					}
					iconClass={
						kpis && kpis.netProfit < 0 ? styles.kpiIconError : undefined
					}
					loading={loading}
				/>
				<KpiCard
					label="ROI"
					value={kpis ? formatPercent(kpis.roi) : null}
					valueClass={
						kpis && kpis.roi < 0
							? styles.kpiValueNegative
							: kpis
								? styles.kpiValuePositive
								: undefined
					}
					icon={<PercentIcon fontSize="small" />}
					iconClass={kpis && kpis.roi < 0 ? styles.kpiIconError : undefined}
					loading={loading}
				/>
				<KpiCard
					label="Margem"
					value={kpis ? formatPercent(kpis.profitMargin) : null}
					icon={<ShowChartIcon fontSize="small" />}
					loading={loading}
				/>
				<KpiCard
					label="Vendas"
					value={kpis ? formatNumber(kpis.totalSales) : null}
					icon={<ShoppingCartIcon fontSize="small" />}
					loading={loading}
				/>
				<KpiCard
					label="Anomalias"
					value={kpis ? formatNumber(kpis.anomaliesCount) : null}
					valueClass={
						kpis && kpis.anomaliesCount > 0
							? styles.kpiValueNegative
							: undefined
					}
					icon={<WarningAmberIcon fontSize="small" />}
					iconClass={
						kpis && kpis.anomaliesCount > 0 ? styles.kpiIconWarning : undefined
					}
					loading={loading}
				/>
			</div>

			<div className={styles.row}>
				<Card
					title="Receita por mês"
					subtitle="Ano atual vs ano anterior">
					{loading || !timeline ? (
						<Skeleton height={300} />
					) : (
						<SalesTimelineChart data={timeline} />
					)}
				</Card>

				<Card
					title="Projeção do mês"
					subtitle="Previsão para o fechamento do mês">
					{loading || !projection ? (
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<Skeleton height={24} />
							<Skeleton height={48} />
							<Skeleton height={20} />
							<Skeleton height={8} />
						</div>
					) : (
						<ProjectionPanel projection={projection} />
					)}
				</Card>
			</div>

			<div className={styles.rowSplit}>
				<Card
					fillBody
					title="Ranking de filiais"
					subtitle="Receita por unidade, colorida por atingimento de meta">
					{loading || !ranking ? (
						<Skeleton height={300} />
					) : ranking.length === 0 ? (
						<div
							style={{
								padding: 24,
								color: "var(--color-text-muted)",
								fontSize: 13,
							}}>
							Sem filiais cadastradas ainda.
						</div>
					) : (
						<>
							<BranchesRankingChart data={ranking} />
							<div className={styles.legendBar}>
								<span className={styles.legendItem}>
									<span
										className={styles.legendDot}
										style={{ background: "var(--color-primary)" }}
									/>
									Meta atingida
								</span>
								<span className={styles.legendItem}>
									<span
										className={styles.legendDot}
										style={{ background: "#d97706" }}
									/>
									75-100%
								</span>
								<span className={styles.legendItem}>
									<span
										className={styles.legendDot}
										style={{ background: "var(--color-error-light)" }}
									/>
									&lt; 75%
								</span>
							</div>
						</>
					)}
				</Card>

				<Card
					title="Top produtos (Pareto 80/20)"
					subtitle="Produtos âncora destacados em verde">
					{loading || !products ? (
						<Skeleton height={340} />
					) : products.products.length === 0 ? (
						<div
							style={{
								padding: 24,
								color: "var(--color-text-muted)",
								fontSize: 13,
							}}>
							Importe um arquivo de vendas para ver os produtos âncora.
						</div>
					) : (
						<>
							<ParetoChart
								products={products.products}
								totalProfit={products.totalProfit}
							/>
							<div className={styles.legendBar}>
								<span className={styles.legendItem}>
									<span
										className={styles.legendDot}
										style={{ background: "var(--color-primary)" }}
									/>
									⚓ Produto âncora
								</span>
								<span className={styles.legendItem}>
									<span
										className={styles.legendDot}
										style={{ background: "var(--color-warning)" }}
									/>
									Demais produtos
								</span>
							</div>
						</>
					)}
				</Card>
			</div>
		</div>
	);
}

interface KpiCardProps {
	label: string;
	value: string | null;
	icon: React.ReactNode;
	iconClass?: string;
	valueClass?: string;
	loading?: boolean;
}

function KpiCard({
	label,
	value,
	icon,
	iconClass,
	valueClass,
	loading,
}: KpiCardProps) {
	return (
		<div className={styles.kpiCard}>
			<div className={styles.kpiHeader}>
				<span className={styles.kpiLabel}>{label}</span>
				<span className={[styles.kpiIcon, iconClass].filter(Boolean).join(" ")}>
					{icon}
				</span>
			</div>
			{loading ? (
				<Skeleton
					height={28}
					width="60%"
				/>
			) : (
				<div
					className={[styles.kpiValue, valueClass].filter(Boolean).join(" ")}>
					{value ?? "—"}
				</div>
			)}
		</div>
	);
}

function ProjectionPanel({ projection }: { projection: Projection }) {
	const max =
		Math.max(
			projection.monthlyGoal ?? projection.projectedMax,
			projection.projectedMax,
		) || 1;
	const minPct = Math.min(100, (projection.projectedMin / max) * 100);
	const maxPct = Math.min(100, (projection.projectedMax / max) * 100);
	const currentPct = Math.min(100, (projection.currentTotal / max) * 100);

	return (
		<div className={styles.projection}>
			<div className={styles.projValues}>
				<span className={styles.projLabel}>Receita até hoje</span>
				<span className={styles.projValue}>
					{formatBRL(projection.currentTotal)}
				</span>
				<span className={styles.projRange}>
					Estimativa: {formatBRL(projection.projectedMin)} –{" "}
					{formatBRL(projection.projectedMax)}
				</span>
			</div>

			<div>
				<div className={styles.progressTrack}>
					<div
						className={styles.progressFillMax}
						style={{
							left: `${minPct}%`,
							width: `${Math.max(0, maxPct - minPct)}%`,
						}}
					/>
					<div
						className={styles.progressFill}
						style={{ width: `${currentPct}%` }}
					/>
				</div>
				<div className={styles.progressMeta}>
					<span>
						Dia {projection.daysElapsed} de {projection.daysInMonth}
					</span>
					{projection.monthlyGoal ? (
						<span>Meta {formatBRL(projection.monthlyGoal)}</span>
					) : (
						<span>Sem meta definida</span>
					)}
				</div>
			</div>

			{projection.goalAchievement !== null ? (
				<div className={styles.projValues}>
					<span className={styles.projLabel}>Atingimento da meta</span>
					<span className={styles.projValue}>
						{formatPercent(projection.goalAchievement)}
					</span>
				</div>
			) : null}
		</div>
	);
}
