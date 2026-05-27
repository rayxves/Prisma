"use client";

import {
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { TopProduct } from "@/types";
import { formatBRL, formatBRLCompact, formatPercent } from "@/services/format";

export interface ParetoChartProps {
	products: TopProduct[];
	totalProfit: number;
	limit?: number;
}

interface ParetoDatum extends TopProduct {
	shortName: string;
	cumulativePct: number;
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: ParetoDatum }>;
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
				minWidth: 240,
			}}>
			<div
				style={{
					fontWeight: 600,
					color: "var(--color-text-primary)",
					marginBottom: 6,
				}}>
				{row.productName}{" "}
				{row.isAnchor ? (
					<span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
						⚓ Âncora
					</span>
				) : null}
			</div>
			<div style={{ display: "grid", gap: 4 }}>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>Lucro</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatBRL(row.netProfit)}
					</span>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>Receita</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatBRL(row.revenue)}
					</span>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>
						Quantidade
					</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>{row.quantity}</span>
				</div>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<span style={{ color: "var(--color-text-secondary)" }}>
						Acumulado
					</span>
					<span style={{ fontFamily: "var(--font-mono)" }}>
						{formatPercent(row.cumulativePct)}
					</span>
				</div>
			</div>
		</div>
	);
}

export function ParetoChart({
	products,
	totalProfit,
	limit = 12,
}: ParetoChartProps) {
	const slice = products.slice(0, limit);
	let acc = 0;
	const data: ParetoDatum[] = slice.map((p) => {
		acc += p.netProfit;
		return {
			...p,
			shortName:
				p.productName.length > 14
					? `${p.productName.slice(0, 13)}…`
					: p.productName,
			cumulativePct: totalProfit > 0 ? (acc / totalProfit) * 100 : 0,
		};
	});

	return (
		<ResponsiveContainer
			width="100%"
			height={340}>
			<ComposedChart
				data={data}
				margin={{ top: 16, right: 24, left: 0, bottom: 40 }}>
				<CartesianGrid
					stroke="var(--color-border)"
					vertical={false}
					strokeDasharray="3 3"
				/>
				<XAxis
					dataKey="shortName"
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={{ stroke: "var(--color-border)" }}
					tickLine={false}
					angle={-25}
					textAnchor="end"
					height={56}
					interval={0}
				/>
				<YAxis
					yAxisId="profit"
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => formatBRLCompact(v)}
					width={70}
				/>
				<YAxis
					yAxisId="pct"
					orientation="right"
					domain={[0, 100]}
					tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => `${v}%`}
					width={40}
				/>
				<Tooltip content={<CustomTooltip />} />
				<Legend
					wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary)" }}
				/>
				<Bar
					yAxisId="profit"
					dataKey="netProfit"
					name="Lucro líquido"
					radius={[3, 3, 0, 0]}>
					{data.map((row) => (
						<Cell
							key={row.productName}
							fill={
								row.isAnchor ? "var(--color-primary)" : "var(--color-warning)"
							}
						/>
					))}
				</Bar>
				<Line
					yAxisId="pct"
					type="monotone"
					dataKey="cumulativePct"
					name="% acumulado"
					stroke="var(--color-error-light)"
					strokeWidth={2}
					dot={{ r: 3, fill: "var(--color-error-light)" }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
