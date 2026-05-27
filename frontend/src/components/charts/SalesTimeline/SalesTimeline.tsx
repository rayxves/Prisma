"use client";

import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { SalesTimelineData } from "@/types";
import { formatBRL, formatBRLCompact } from "@/services/format";

const MONTHS = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
];

export interface SalesTimelineChartProps {
	data: SalesTimelineData;
}

interface ChartDatum {
	month: string;
	current: number | null;
	previous: number | null;
}

function CustomTooltip({
	active,
	payload,
	label,
	currentYear,
	previousYear,
}: {
	active?: boolean;
	payload?: Array<{ value: number; dataKey: string }>;
	label?: string;
	currentYear: number;
	previousYear: number;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-md)",
				padding: "10px 14px",
				boxShadow: "var(--shadow-md)",
				fontSize: 12,
			}}>
			<div
				style={{
					fontWeight: 600,
					marginBottom: 6,
					color: "var(--color-text-primary)",
				}}>
				{label}
			</div>
			{payload.map((p) => (
				<div
					key={p.dataKey}
					style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
					<span style={{ color: "var(--color-text-secondary)" }}>
						{p.dataKey === "current" ? currentYear : previousYear}
					</span>
					<span
						style={{
							fontFamily: "var(--font-mono)",
							color: "var(--color-text-primary)",
						}}>
						{formatBRL(p.value)}
					</span>
				</div>
			))}
		</div>
	);
}

export function SalesTimelineChart({ data }: SalesTimelineChartProps) {
	const chartData: ChartDatum[] = MONTHS.map((m, idx) => ({
		month: m,
		current: data.timeline[idx + 1]?.currentYear ?? null,
		previous: data.timeline[idx + 1]?.previousYear ?? null,
	}));

	return (
		<ResponsiveContainer
			width="100%"
			height={300}>
			<ComposedChart
				data={chartData}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
				<defs>
					<linearGradient
						id="currentArea"
						x1="0"
						y1="0"
						x2="0"
						y2="1">
						<stop
							offset="0%"
							stopColor="var(--color-primary)"
							stopOpacity={0.28}
						/>
						<stop
							offset="100%"
							stopColor="var(--color-primary)"
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid
					stroke="var(--color-border)"
					vertical={false}
					strokeDasharray="3 3"
				/>
				<XAxis
					dataKey="month"
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={{ stroke: "var(--color-border)" }}
					tickLine={false}
				/>
				<YAxis
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => formatBRLCompact(v)}
					width={70}
				/>
				<Tooltip
					content={
						<CustomTooltip
							currentYear={data.currentYear}
							previousYear={data.previousYear}
						/>
					}
				/>
				<Legend
					formatter={(value) =>
						value === "current" ? `${data.currentYear}` : `${data.previousYear}`
					}
					wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }}
				/>
				<Area
					type="monotone"
					dataKey="current"
					stroke="none"
					fill="url(#currentArea)"
					isAnimationActive
				/>
				<Line
					type="monotone"
					dataKey="current"
					stroke="var(--color-primary)"
					strokeWidth={2.5}
					dot={false}
					activeDot={{ r: 5, fill: "var(--color-primary)" }}
				/>
				<Line
					type="monotone"
					dataKey="previous"
					stroke="var(--color-text-muted)"
					strokeWidth={1.5}
					strokeDasharray="5 5"
					dot={false}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
