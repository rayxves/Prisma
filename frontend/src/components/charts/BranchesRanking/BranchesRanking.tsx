"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { BranchRanking } from "@/types";
import { formatBRL, formatBRLCompact, formatPercent } from "@/services/format";

export interface BranchesRankingChartProps {
	data: BranchRanking[];
}

function colorForAchievement(achievement: number | null): string {
	if (achievement === null) return "var(--color-text-muted)";
	if (achievement >= 100) return "var(--color-primary)";
	if (achievement >= 75) return "#d97706";
	return "var(--color-error-light)";
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: BranchRanking }>;
}) {
	if (!active || !payload?.length) return null;
	const row = payload[0].payload;
	return (
		<div
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-md)",
				padding: "12px 14px",
				boxShadow: "var(--shadow-md)",
				fontSize: 12,
				minWidth: 220,
			}}>
			<div
				style={{
					fontWeight: 600,
					color: "var(--color-text-primary)",
					marginBottom: 6,
				}}>
				{row.name}{" "}
				<span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
					({row.city}/{row.state})
				</span>
			</div>
			<div style={{ display: "grid", gap: 4 }}>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>Receita</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatBRL(row.revenue)}
					</span>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>Margem</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatPercent(row.margin)}
					</span>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>Meta</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatBRL(row.monthlyGoal)}
					</span>
				</div>
				{row.goalAchievement !== null ? (
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ color: "var(--color-text-secondary)" }}>
							Atingimento
						</span>
						<span style={{ fontFamily: "var(--font-mono)" }}>
							{formatPercent(row.goalAchievement)}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function BranchesRankingChart({ data }: BranchesRankingChartProps) {
	const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
	const minHeight = Math.max(220, sorted.length * 36 + 40);

	return (
		<div style={{ flex: 1, minHeight }}>
		<ResponsiveContainer
			width="100%"
			height="100%">
			<BarChart
				data={sorted}
				layout="vertical"
				margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
				<CartesianGrid
					stroke="var(--color-border)"
					horizontal={false}
					strokeDasharray="3 3"
				/>
				<XAxis
					type="number"
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => formatBRLCompact(v)}
				/>
				<YAxis
					type="category"
					dataKey="name"
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					width={120}
				/>
				<Tooltip
					cursor={{ fill: "var(--color-surface-elevated)" }}
					content={<CustomTooltip />}
				/>
				<Bar
					dataKey="revenue"
					radius={[0, 4, 4, 0]}>
					{sorted.map((row) => (
						<Cell
							key={row.branchId}
							fill={colorForAchievement(row.goalAchievement)}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
		</div>
	);
}
