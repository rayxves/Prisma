"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HistoryIcon from "@mui/icons-material/History";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Table, type Column } from "@/components/ui/Table/Table";
import {
	auditLogsService,
	type AuditLogFilters,
} from "@/services/audit-logs.service";
import { usersService } from "@/services/users.service";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/services/format";
import type { AuditLog, User } from "@/types";
import styles from "./audit-logs.module.css";

const PAGE_SIZE = 25;

function isoDaysAgo(days: number) {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString().split("T")[0];
}

function isoToday() {
	return new Date().toISOString().split("T")[0];
}

function actionIcon(action: string) {
	const lower = action.toLowerCase();
	if (lower.includes("create")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconCreate}`}>
				<AddIcon fontSize="inherit" />
			</span>
		);
	}
	if (lower.includes("update") || lower.includes("edit")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconUpdate}`}>
				<EditIcon fontSize="inherit" />
			</span>
		);
	}
	if (lower.includes("delete") || lower.includes("remove")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconDelete}`}>
				<DeleteIcon fontSize="inherit" />
			</span>
		);
	}
	if (lower.includes("login")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconLogin}`}>
				<LoginIcon fontSize="inherit" />
			</span>
		);
	}
	if (lower.includes("logout")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconLogin}`}>
				<LogoutIcon fontSize="inherit" />
			</span>
		);
	}
	if (lower.includes("upload")) {
		return (
			<span className={`${styles.actionIcon} ${styles.iconUpdate}`}>
				<UploadFileIcon fontSize="inherit" />
			</span>
		);
	}
	return (
		<span className={`${styles.actionIcon} ${styles.iconDefault}`}>
			<HistoryIcon fontSize="inherit" />
		</span>
	);
}

function escapeCSV(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export default function AuditLogsPage() {
	const toast = useToast();
	const router = useRouter();
	const { user } = useAuth();

	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	const [userIdFilter, setUserIdFilter] = useState<string>("");
	const [from, setFrom] = useState(isoDaysAgo(30));
	const [to, setTo] = useState(isoToday());
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		if (user && user.role !== "ADMIN") {
			router.replace("/forbidden");
		}
	}, [user, router]);

	useEffect(() => {
		usersService
			.list()
			.then(setUsers)
			.catch(() => {});
	}, []);

	useEffect(() => {
		setLoading(true);
		const filters: AuditLogFilters = {
			...(userIdFilter ? { userId: userIdFilter } : {}),
			from: new Date(from).toISOString(),
			to: new Date(`${to}T23:59:59`).toISOString(),
			page,
			pageSize: PAGE_SIZE,
		};
		auditLogsService
			.list(filters)
			.then((res) => {
				if (Array.isArray(res)) {
					setLogs(res);
					setTotal(res.length);
				} else {
					setLogs(res.data ?? []);
					setTotal(res.total ?? res.data?.length ?? 0);
				}
			})
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar logs",
				),
			)
			.finally(() => setLoading(false));
	}, [userIdFilter, from, to, page]);

	const filtered = useMemo(() => {
		if (!search.trim()) return logs;
		const q = search.toLowerCase();
		return logs.filter((l) => {
			const action = String(l.action ?? "").toLowerCase();
			const target = String(l.targetType ?? "").toLowerCase();
			const userName = String(l.user?.name ?? "").toLowerCase();
			return action.includes(q) || target.includes(q) || userName.includes(q);
		});
	}, [logs, search]);

	function exportCSV() {
		const headers = [
			"Data/Hora",
			"Usuário",
			"E-mail",
			"Ação",
			"Recurso",
			"ID Alvo",
		];
		const rows = filtered.map((l) => [
			formatDateTime(l.timestamp),
			l.user?.name ?? "",
			l.user?.email ?? "",
			String(l.action ?? ""),
			String(l.targetType ?? ""),
			String(l.targetId ?? ""),
		]);
		const csv = [headers, ...rows]
			.map((row) => row.map((cell) => escapeCSV(String(cell))).join(","))
			.join("\n");
		const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `audit-logs-${isoToday()}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("CSV exportado");
	}

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const columns: Column<AuditLog>[] = [
		{
			key: "createdAt",
			header: "Data / Hora",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 12
					}}>
					{formatDateTime(row.timestamp)}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.timestamp,
		},
		{
			key: "user",
			header: "Usuário",
			render: (row) => (
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<span style={{ fontWeight: 500 }}>{row.user?.name ?? "—"}</span>
					<span
						style={{
							fontSize: 11,
							color: "var(--color-text-muted)",
							fontFamily: "var(--font-mono)",
						}}>
						{row.user?.email ?? ""}
					</span>
				</div>
			),
		},
		{
			key: "action",
			header: "Ação",
			render: (row) => (
				<div className={styles.actionCell}>
					{actionIcon(String(row.action ?? ""))}
					<span
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 12,
							fontWeight: 500,
						}}>
						{String(row.action ?? "")}
					</span>
				</div>
			),
		},
		{
			key: "target",
			header: "Recurso",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 12,
						color: "var(--color-text-secondary)",
					}}>
					{row.targetType
						? `${row.targetType}${row.targetId ? ` · ${String(row.targetId).slice(0, 8)}…` : ""}`
						: "—"}
				</span>
			),
		},
	];

	if (user && user.role !== "ADMIN") return null;

	return (
		<div>
			<PageHeader
				eyebrow="Trilha de auditoria"
				title="Audit Logs"
				description="Histórico imutável de ações realizadas no tenant. Use os filtros para investigar mudanças específicas."
				actions={
					<Button
						variant="secondary"
						leftIcon={<DownloadIcon fontSize="small" />}
						onClick={exportCSV}>
						Exportar CSV
					</Button>
				}
			/>

			<div className={styles.toolbar}>
				<div className={styles.field}>
					<label className={styles.fieldLabel}>Usuário</label>
					<Select
						value={userIdFilter}
						onChange={(e) => {
							setUserIdFilter(e.target.value);
							setPage(1);
						}}
						placeholder="Todos os usuários"
						options={[
							{ value: "", label: "Todos os usuários" },
							...users.map((u) => ({ value: u.id, label: u.name })),
						]}
					/>
				</div>
				<DatePicker
					label="De"
					value={from}
					max={to}
					onChange={(v) => {
						setFrom(v);
						setPage(1);
					}}
				/>
				<DatePicker
					label="Até"
					value={to}
					min={from}
					max={isoToday()}
					onChange={(v) => {
						setTo(v);
						setPage(1);
					}}
				/>
				<div className={styles.search}>
					<label className={styles.fieldLabel}>Buscar</label>
					<input
						type="search"
						className={styles.searchInput}
						placeholder="Ação, recurso ou usuário..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			<Card>
				<Table
					columns={columns}
					rows={filtered}
					rowKey={(r) => r.id}
					loading={loading}
					emptyTitle="Nenhum log no período selecionado"
				/>

				<div className={styles.pagination}>
					<span>
						Página {page} de {totalPages} · {total} registro(s)
					</span>
					<div className={styles.pagBtns}>
						<Button
							size="sm"
							variant="ghost"
							disabled={page <= 1 || loading}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							leftIcon={<ChevronLeftIcon fontSize="small" />}>
							Anterior
						</Button>
						<Button
							size="sm"
							variant="ghost"
							disabled={page >= totalPages || loading}
							onClick={() => setPage((p) => p + 1)}
							rightIcon={<ChevronRightIcon fontSize="small" />}>
							Próxima
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
