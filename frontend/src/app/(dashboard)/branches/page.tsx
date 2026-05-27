"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { Input } from "@/components/ui/Input/Input";
import { Select } from "@/components/ui/Select/Select";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { branchesService, type BranchInput } from "@/services/branches.service";
import { dashboardService } from "@/services/dashboard.service";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatPercent } from "@/services/format";
import type { Branch, BranchRanking } from "@/types";
import styles from "./branches.module.css";

const STATES = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
];

interface BranchRow extends Branch {
	revenue?: number;
	margin?: number;
	goalAchievement?: number | null;
}

interface FormState {
	name: string;
	city: string;
	state: string;
	monthlyGoal: string;
}

const EMPTY_FORM: FormState = {
	name: "",
	city: "",
	state: "",
	monthlyGoal: "",
};

export default function BranchesPage() {
	const toast = useToast();
	const { user } = useAuth();
	const isAdmin = user?.role === "ADMIN";

	const [branches, setBranches] = useState<Branch[]>([]);
	const [ranking, setRanking] = useState<BranchRanking[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<Branch | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [formErrors, setFormErrors] = useState<
		Partial<Record<keyof FormState, string>>
	>({});
	const [saving, setSaving] = useState(false);

	const [deleting, setDeleting] = useState<Branch | null>(null);

	function reload() {
		setLoading(true);
		Promise.all([branchesService.list(), dashboardService.branchesRanking()])
			.then(([list, rank]) => {
				setBranches(list);
				setRanking(rank);
			})
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar filiais",
				),
			)
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		reload();
	}, []);

	const rows: BranchRow[] = useMemo(() => {
		const rankingMap = new Map(ranking.map((r) => [r.branchId, r]));
		return branches.map((b) => {
			const r = rankingMap.get(b.id);
			return {
				...b,
				revenue: r?.revenue,
				margin: r?.margin,
				goalAchievement: r?.goalAchievement ?? null,
			};
		});
	}, [branches, ranking]);

	const filtered = useMemo(() => {
		if (!search.trim()) return rows;
		const q = search.toLowerCase();
		return rows.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.city.toLowerCase().includes(q) ||
				r.state.toLowerCase().includes(q),
		);
	}, [rows, search]);

	const topRoiId = useMemo(() => {
		if (ranking.length === 0) return null;
		const sorted = [...ranking].sort((a, b) => {
			const aRoi =
				a.revenue > 0
					? ((a.revenue - (a.revenue - a.netProfit)) / a.revenue) * 100
					: 0;
			const bRoi =
				b.revenue > 0
					? ((b.revenue - (b.revenue - b.netProfit)) / b.revenue) * 100
					: 0;
			return bRoi - aRoi;
		});
		return sorted[0]?.branchId ?? null;
	}, [ranking]);

	function openCreate() {
		setEditing(null);
		setForm(EMPTY_FORM);
		setFormErrors({});
		setModalOpen(true);
	}

	function openEdit(branch: Branch) {
		setEditing(branch);
		setForm({
			name: branch.name,
			city: branch.city,
			state: branch.state,
			monthlyGoal: String(branch.monthlyGoal),
		});
		setFormErrors({});
		setModalOpen(true);
	}

	function validate(): boolean {
		const errs: Partial<Record<keyof FormState, string>> = {};
		if (form.name.trim().length < 2) errs.name = "Nome muito curto";
		if (form.city.trim().length < 2) errs.city = "Cidade muito curta";
		if (!STATES.includes(form.state)) errs.state = "Selecione um estado";
		const goal = Number(form.monthlyGoal);
		if (!Number.isFinite(goal) || goal <= 0)
			errs.monthlyGoal = "Meta deve ser positiva";
		setFormErrors(errs);
		return Object.keys(errs).length === 0;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!validate()) return;
		setSaving(true);
		const payload: BranchInput = {
			name: form.name.trim(),
			city: form.city.trim(),
			state: form.state,
			monthlyGoal: Number(form.monthlyGoal),
		};
		try {
			if (editing) {
				await branchesService.update(editing.id, payload);
				toast.success("Filial atualizada");
			} else {
				await branchesService.create(payload);
				toast.success("Filial criada");
			}
			setModalOpen(false);
			reload();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao salvar");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!deleting) return;
		try {
			await branchesService.remove(deleting.id);
			toast.success("Filial excluída");
			setDeleting(null);
			reload();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao excluir");
		}
	}

	function goalAchievementColor(pct: number | null | undefined): string {
		if (pct === null || pct === undefined) return "var(--color-text-muted)";
		if (pct >= 100) return "var(--color-primary)";
		if (pct >= 75) return "#d97706";
		return "var(--color-error-light)";
	}

	const columns: Column<BranchRow>[] = [
		{
			key: "name",
			header: "Filial",
			render: (row) => (
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span style={{ fontWeight: 600 }}>{row.name}</span>
					{row.id === topRoiId ? (
						<span
							title="Maior ROI"
							style={{ color: "#d97706", display: "inline-flex" }}>
							<LocalFireDepartmentIcon fontSize="inherit" />
						</span>
					) : null}
				</div>
			),
			sortable: true,
			sortValue: (r) => r.name,
		},
		{
			key: "location",
			header: "Localização",
			render: (row) => (
				<span style={{ color: "var(--color-text-secondary)" }}>
					{row.city}/<strong>{row.state}</strong>
				</span>
			),
			sortable: true,
			sortValue: (r) => `${r.state}-${r.city}`,
		},
		{
			key: "monthlyGoal",
			header: "Meta mensal",
			render: (row) => (
				<span style={{ fontFamily: "var(--font-mono)" }}>
					{formatBRL(row.monthlyGoal)}
				</span>
			),
			sortable: true,
			sortValue: (r) => Number(r.monthlyGoal),
		},
		{
			key: "revenue",
			header: "Faturamento",
			render: (row) => (
				<span style={{ fontFamily: "var(--font-mono)" }}>
					{formatBRL(row.revenue ?? 0)}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.revenue ?? 0,
		},
		{
			key: "margin",
			header: "Margem",
			render: (row) =>
				row.margin !== undefined ? (
					<Badge variant={row.margin >= 0 ? "success" : "danger"}>
						{formatPercent(row.margin)}
					</Badge>
				) : (
					<span style={{ color: "var(--color-text-muted)" }}>—</span>
				),
			sortable: true,
			sortValue: (r) => r.margin ?? -999,
		},
		{
			key: "achievement",
			header: "Atingimento",
			render: (row) => {
				const pct = row.goalAchievement;
				if (pct === null || pct === undefined) {
					return <span style={{ color: "var(--color-text-muted)" }}>—</span>;
				}
				const width = Math.min(100, Math.max(0, pct));
				return (
					<div className={styles.progressInline}>
						<div className={styles.progressInlineTrack}>
							<div
								className={styles.progressInlineFill}
								style={{
									width: `${width}%`,
									background: goalAchievementColor(pct),
								}}
							/>
						</div>
						<span className={styles.progressInlineLabel}>
							{formatPercent(pct)}
						</span>
					</div>
				);
			},
			sortable: true,
			sortValue: (r) => r.goalAchievement ?? -1,
		},
		...(isAdmin
			? [
					{
						key: "actions",
						header: "Ações",
						align: "right" as const,
						render: (row: BranchRow) => (
							<div className={styles.actionBtns}>
								<button
									type="button"
									className={styles.iconAction}
									onClick={() => openEdit(row)}
									aria-label={`Editar ${row.name}`}>
									<EditIcon fontSize="small" />
								</button>
								<button
									type="button"
									className={[styles.iconAction, styles.iconActionDanger].join(
										" ",
									)}
									onClick={() => setDeleting(row)}
									aria-label={`Excluir ${row.name}`}>
									<DeleteIcon fontSize="small" />
								</button>
							</div>
						),
					},
				]
			: []),
	];

	return (
		<div>
			<PageHeader
				eyebrow="Rede"
				title="Filiais"
				description="Gerencie unidades, metas mensais e acompanhe o atingimento por ponto de venda."
				actions={
					isAdmin ? (
						<Button
							leftIcon={<AddIcon fontSize="small" />}
							onClick={openCreate}>
							Nova filial
						</Button>
					) : null
				}
			/>

			<div className={styles.toolbar}>
				<div className={styles.search}>
					<input
						type="search"
						className={styles.searchInput}
						placeholder="Buscar por nome, cidade ou estado..."
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
					emptyTitle="Nenhuma filial cadastrada"
					emptyDescription={
						isAdmin
							? "Crie sua primeira filial para começar a importar vendas."
							: undefined
					}
				/>
			</Card>

			<Modal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				title={editing ? "Editar filial" : "Nova filial"}
				size="md"
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => setModalOpen(false)}
							disabled={saving}>
							Cancelar
						</Button>
						<Button
							onClick={handleSubmit}
							loading={saving}>
							{editing ? "Salvar alterações" : "Criar filial"}
						</Button>
					</>
				}>
				<form
					onSubmit={handleSubmit}
					className={styles.formGrid}>
					<div className={styles.formGridFull}>
						<Input
							label="Nome"
							required
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							error={formErrors.name}
							placeholder="Filial Centro"
						/>
					</div>
					<Input
						label="Cidade"
						required
						value={form.city}
						onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
						error={formErrors.city}
						placeholder="São Paulo"
					/>
					<Select
						label="Estado"
						required
						value={form.state}
						onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
						error={formErrors.state}
						placeholder="UF"
						options={STATES.map((s) => ({ value: s, label: s }))}
					/>
					<div className={styles.formGridFull}>
						<Input
							label="Meta mensal (R$)"
							required
							type="number"
							min={0}
							step="0.01"
							value={form.monthlyGoal}
							onChange={(e) =>
								setForm((f) => ({ ...f, monthlyGoal: e.target.value }))
							}
							error={formErrors.monthlyGoal}
							placeholder="50000"
						/>
					</div>
				</form>
			</Modal>

			<ConfirmModal
				open={Boolean(deleting)}
				onClose={() => setDeleting(null)}
				onConfirm={handleDelete}
				title="Excluir filial"
				message={
					<>
						Excluir filial <strong>{deleting?.name}</strong>? Todas as vendas e
						métricas associadas serão removidas. Esta ação não pode ser
						desfeita.
					</>
				}
				confirmLabel="Excluir"
				danger
			/>
		</div>
	);
}
