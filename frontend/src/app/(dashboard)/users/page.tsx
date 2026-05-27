"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyIcon from "@mui/icons-material/Key";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { Input } from "@/components/ui/Input/Input";
import { Select } from "@/components/ui/Select/Select";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import {
	usersService,
	type CreateUserInput,
	type UpdateUserInput,
} from "@/services/users.service";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/services/format";
import type { User, UserRole } from "@/types";
import styles from "./users.module.css";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
	{ value: "ADMIN", label: "Administrador" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "VIEWER", label: "Visualizador" },
];

interface FormState {
	name: string;
	email: string;
	role: UserRole;
	password: string;
}

const EMPTY_FORM: FormState = {
	name: "",
	email: "",
	role: "EDITOR",
	password: "",
};

function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleBadge(role: UserRole) {
	if (role === "ADMIN") return <Badge variant="primary">Admin</Badge>;
	if (role === "EDITOR") return <Badge variant="info">Operador</Badge>;
	return <Badge variant="neutral">Visualizador</Badge>;
}

export default function UsersPage() {
	const toast = useToast();
	const router = useRouter();
	const { user } = useAuth();

	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<User | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [errors, setErrors] = useState<
		Partial<Record<keyof FormState, string>>
	>({});
	const [saving, setSaving] = useState(false);

	const [deleting, setDeleting] = useState<User | null>(null);

	const [pwdOpen, setPwdOpen] = useState<User | null>(null);
	const [pwdForm, setPwdForm] = useState({
		newPassword: "",
		confirmPassword: "",
	});
	const [pwdErrors, setPwdErrors] = useState<{
		newPassword?: string;
		confirmPassword?: string;
	}>({});
	const [pwdSaving, setPwdSaving] = useState(false);

	useEffect(() => {
		if (user && user.role !== "ADMIN") {
			router.replace("/forbidden");
		}
	}, [user, router]);

	function reload() {
		setLoading(true);
		usersService
			.list()
			.then(setUsers)
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar usuários",
				),
			)
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		reload();
	}, []);

	const filtered = useMemo(() => {
		if (!search.trim()) return users;
		const q = search.toLowerCase();
		return users.filter(
			(u) =>
				u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
		);
	}, [users, search]);

	function openCreate() {
		setEditing(null);
		setForm(EMPTY_FORM);
		setErrors({});
		setModalOpen(true);
	}

	function openEdit(u: User) {
		setEditing(u);
		setForm({ name: u.name, email: u.email, role: u.role, password: "" });
		setErrors({});
		setModalOpen(true);
	}

	function validate(): boolean {
		const errs: Partial<Record<keyof FormState, string>> = {};
		if (form.name.trim().length < 2) errs.name = "Nome muito curto";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = "E-mail inválido";
		if (!editing && form.password.length < 6)
			errs.password = "Senha de pelo menos 6 caracteres";
		setErrors(errs);
		return Object.keys(errs).length === 0;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!validate()) return;
		setSaving(true);
		try {
			if (editing) {
				const payload: UpdateUserInput = {
					name: form.name.trim(),
					email: form.email.toLowerCase().trim(),
					role: form.role,
				};
				await usersService.update(editing.id, payload);
				toast.success("Usuário atualizado");
			} else {
				const payload: CreateUserInput = {
					name: form.name.trim(),
					email: form.email.toLowerCase().trim(),
					role: form.role,
					password: form.password,
				};
				await usersService.create(payload);
				toast.success("Usuário criado");
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
			await usersService.remove(deleting.id);
			toast.success("Usuário removido");
			setDeleting(null);
			reload();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao remover");
		}
	}

	function validatePwd(): boolean {
		const errs: typeof pwdErrors = {};
		if (pwdForm.newPassword.length < 6)
			errs.newPassword = "Senha de pelo menos 6 caracteres";
		if (pwdForm.newPassword !== pwdForm.confirmPassword)
			errs.confirmPassword = "As senhas não coincidem";
		setPwdErrors(errs);
		return Object.keys(errs).length === 0;
	}

	async function handleChangePassword() {
		if (!pwdOpen) return;
		if (!validatePwd()) return;
		setPwdSaving(true);
		try {
			await usersService.changePassword(pwdOpen.id, {
				newPassword: pwdForm.newPassword,
				confirmPassword: pwdForm.confirmPassword,
			});
			toast.success("Senha alterada com sucesso");
			setPwdOpen(null);
			setPwdForm({ newPassword: "", confirmPassword: "" });
			setPwdErrors({});
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Falha ao alterar senha",
			);
		} finally {
			setPwdSaving(false);
		}
	}

	const columns: Column<User>[] = [
		{
			key: "name",
			header: "Usuário",
			render: (row) => (
				<span>
					<span className={styles.avatar}>{initials(row.name)}</span>
					<strong>{row.name}</strong>
				</span>
			),
			sortable: true,
			sortValue: (r) => r.name,
		},
		{
			key: "email",
			header: "E-mail",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 12,
						color: "var(--color-text-secondary)",
					}}>
					{row.email}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.email,
		},
		{
			key: "role",
			header: "Função",
			render: (row) => roleBadge(row.role),
			sortable: true,
			sortValue: (r) => r.role,
		},
		{
			key: "createdAt",
			header: "Criado em",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 12,
						color: "var(--color-text-muted)",
					}}>
					{formatDateTime(row.createdAt)}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.createdAt,
		},
		{
			key: "actions",
			header: "Ações",
			align: "right",
			render: (row) => (
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
						className={styles.iconAction}
						onClick={() => setPwdOpen(row)}
						aria-label={`Trocar senha de ${row.name}`}>
						<KeyIcon fontSize="small" />
					</button>
					<button
						type="button"
						className={`${styles.iconAction} ${styles.iconActionDanger}`}
						onClick={() => setDeleting(row)}
						aria-label={`Excluir ${row.name}`}
						disabled={row.id === user?.id}>
						<DeleteIcon fontSize="small" />
					</button>
				</div>
			),
		},
	];

	if (user && user.role !== "ADMIN") return null;

	return (
		<div>
			<PageHeader
				eyebrow="Equipe"
				title="Usuários"
				description="Controle quem tem acesso ao tenant e qual nível de permissão cada pessoa possui."
				actions={
					<Button
						leftIcon={<AddIcon fontSize="small" />}
						onClick={openCreate}>
						Novo usuário
					</Button>
				}
			/>

			<div className={styles.toolbar}>
				<div className={styles.search}>
					<input
						type="search"
						className={styles.searchInput}
						placeholder="Buscar por nome ou e-mail..."
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
					emptyTitle="Nenhum usuário cadastrado"
				/>
			</Card>

			<Modal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				title={editing ? "Editar usuário" : "Novo usuário"}
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
							{editing ? "Salvar alterações" : "Criar usuário"}
						</Button>
					</>
				}>
				<form
					onSubmit={handleSubmit}
					className={styles.formGrid}>
					<div className={styles.formFull}>
						<Input
							label="Nome"
							required
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							error={errors.name}
						/>
					</div>
					<div className={styles.formFull}>
						<Input
							label="E-mail"
							required
							type="email"
							value={form.email}
							onChange={(e) =>
								setForm((f) => ({ ...f, email: e.target.value }))
							}
							error={errors.email}
						/>
					</div>
					<Select
						label="Função"
						required
						value={form.role}
						onChange={(e) =>
							setForm((f) => ({ ...f, role: e.target.value as UserRole }))
						}
						options={ROLE_OPTIONS}
					/>
					{!editing ? (
						<Input
							label="Senha inicial"
							required
							type="password"
							value={form.password}
							onChange={(e) =>
								setForm((f) => ({ ...f, password: e.target.value }))
							}
							error={errors.password}
							hint="Mínimo 6 caracteres"
						/>
					) : null}
				</form>
			</Modal>

			<Modal
				open={Boolean(pwdOpen)}
				onClose={() => setPwdOpen(null)}
				title="Trocar senha"
				subtitle={pwdOpen?.name}
				size="sm"
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => setPwdOpen(null)}
							disabled={pwdSaving}>
							Cancelar
						</Button>
						<Button
							onClick={handleChangePassword}
							loading={pwdSaving}>
							Alterar senha
						</Button>
					</>
				}>
				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<Input
						label="Nova senha"
						required
						type="password"
						value={pwdForm.newPassword}
						onChange={(e) =>
							setPwdForm((f) => ({ ...f, newPassword: e.target.value }))
						}
						error={pwdErrors.newPassword}
						hint="Mínimo 6 caracteres"
					/>
					<Input
						label="Confirmar nova senha"
						required
						type="password"
						value={pwdForm.confirmPassword}
						onChange={(e) =>
							setPwdForm((f) => ({ ...f, confirmPassword: e.target.value }))
						}
						error={pwdErrors.confirmPassword}
					/>
				</div>
			</Modal>

			<ConfirmModal
				open={Boolean(deleting)}
				onClose={() => setDeleting(null)}
				onConfirm={handleDelete}
				title="Excluir usuário"
				message={
					<>
						Excluir o usuário <strong>{deleting?.name}</strong>? Esta ação não
						pode ser desfeita.
					</>
				}
				confirmLabel="Excluir"
				danger
			/>
		</div>
	);
}
