"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import InboxIcon from "@mui/icons-material/Inbox";
import { Skeleton } from "../Skeleton/Skeleton";
import styles from "./Table.module.css";

export interface Column<T> {
	key: string;
	header: ReactNode;
	render: (row: T) => ReactNode;
	sortable?: boolean;
	sortValue?: (row: T) => string | number | null | undefined;
	width?: string | number;
	align?: "left" | "right" | "center";
}

export interface TableProps<T> {
	columns: Column<T>[];
	rows: T[];
	loading?: boolean;
	loadingRows?: number;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyIcon?: ReactNode;
	rowKey: (row: T) => string;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function Table<T>({
	columns,
	rows,
	loading = false,
	loadingRows = 5,
	emptyTitle = "Nenhum registro encontrado",
	emptyDescription,
	emptyIcon,
	rowKey,
}: TableProps<T>) {
	const [sort, setSort] = useState<SortState>(null);

	const sortedRows = useMemo(() => {
		if (!sort) return rows;
		const col = columns.find((c) => c.key === sort.key);
		if (!col || !col.sortValue) return rows;
		const sorter = col.sortValue;
		const copy = [...rows];
		copy.sort((a, b) => {
			const va = sorter(a) ?? "";
			const vb = sorter(b) ?? "";
			if (va < vb) return sort.direction === "asc" ? -1 : 1;
			if (va > vb) return sort.direction === "asc" ? 1 : -1;
			return 0;
		});
		return copy;
	}, [rows, sort, columns]);

	const handleSort = (col: Column<T>) => {
		if (!col.sortable) return;
		setSort((prev) => {
			if (!prev || prev.key !== col.key)
				return { key: col.key, direction: "asc" };
			if (prev.direction === "asc") return { key: col.key, direction: "desc" };
			return null;
		});
	};

	return (
		<div className={styles.wrap}>
			<div className={styles.scroll}>
				<table className={styles.table}>
					<thead className={styles.thead}>
						<tr>
							{columns.map((col) => {
								const isSorted = sort?.key === col.key;
								const style: CSSProperties = {};
								if (col.width)
									style.width =
										typeof col.width === "number"
											? `${col.width}px`
											: col.width;
								if (col.align) style.textAlign = col.align;
								return (
									<th
										key={col.key}
										style={style}
										className={[
											styles.th,
											col.sortable ? styles.thSortable : "",
										]
											.filter(Boolean)
											.join(" ")}
										onClick={() => handleSort(col)}>
										<span className={styles.thContent}>
											{col.header}
											{col.sortable && isSorted ? (
												sort?.direction === "asc" ? (
													<ArrowUpwardIcon fontSize="inherit" />
												) : (
													<ArrowDownwardIcon fontSize="inherit" />
												)
											) : null}
										</span>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{loading
							? Array.from({ length: loadingRows }).map((_, i) => (
									<tr
										key={`sk-${i}`}
										className={styles.tr}>
										{columns.map((col) => (
											<td
												key={col.key}
												className={styles.td}>
												<Skeleton height={14} />
											</td>
										))}
									</tr>
								))
							: sortedRows.map((row) => (
									<tr
										key={rowKey(row)}
										className={styles.tr}>
										{columns.map((col) => {
											const style: CSSProperties = col.align
												? { textAlign: col.align }
												: {};
											return (
												<td
													key={col.key}
													className={styles.td}
													style={style}>
													{col.render(row)}
												</td>
											);
										})}
									</tr>
								))}
					</tbody>
				</table>
			</div>
			{!loading && rows.length === 0 ? (
				<div className={styles.empty}>
					<div className={styles.emptyIcon}>
						{emptyIcon ?? <InboxIcon fontSize="medium" />}
					</div>
					<div className={styles.emptyTitle}>{emptyTitle}</div>
					{emptyDescription ? (
						<div className={styles.emptyDesc}>{emptyDescription}</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
