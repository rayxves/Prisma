"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { MaskedInput } from "@/components/forms/MaskedInput/MaskedInput";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { tenantService } from "@/services/tenant.service";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, maskCNPJ } from "@/services/format";
import type { Tenant, TenantPlan } from "@/types";
import styles from "./tenant.module.css";

interface PlanCardData {
	value: TenantPlan;
	label: string;
	price: string;
	desc: string;
}

const PLANS: PlanCardData[] = [
	{
		value: "FREE",
		label: "Free",
		price: "R$ 0/mês",
		desc: "Até 1 filial · análise básica",
	},
	{
		value: "PRO",
		label: "Pro",
		price: "R$ 199/mês",
		desc: "Até 10 filiais · detecção de anomalias",
	},
	{
		value: "ENTERPRISE",
		label: "Enterprise",
		price: "sob consulta",
		desc: "Filiais ilimitadas · SLA dedicado",
	},
];

export default function TenantPage() {
	const toast = useToast();
	const router = useRouter();
	const { user, refreshUser } = useAuth();

	const [tenant, setTenant] = useState<Tenant | null>(null);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState("");
	const [plan, setPlan] = useState<TenantPlan>("FREE");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (user && user.role !== "ADMIN") {
			router.replace("/forbidden");
		}
	}, [user, router]);

	useEffect(() => {
		setLoading(true);
		tenantService
			.get()
			.then((t) => {
				setTenant(t);
				setName(t.name);
				setPlan(t.plan);
			})
			.catch((err: unknown) =>
				toast.error(
					err instanceof Error ? err.message : "Falha ao carregar empresa",
				),
			)
			.finally(() => setLoading(false));
	}, []);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (name.trim().length < 2) {
			setError("Nome muito curto");
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await tenantService.update({ name: name.trim(), plan });
			toast.success("Dados da empresa atualizados");
			await refreshUser();
			tenantService
				.get()
				.then(setTenant)
				.catch(() => {});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao salvar");
		} finally {
			setSaving(false);
		}
	}

	if (user && user.role !== "ADMIN") return null;

	return (
		<div>
			<PageHeader
				eyebrow="Configuração"
				title="Empresa"
				description="Dados da sua organização e plano contratado."
			/>

			<div className={styles.grid}>
				<Card
					title="Dados gerais"
					subtitle="Edite o nome fantasia e o plano da assinatura">
					{loading ? (
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							<Skeleton height={48} />
							<Skeleton height={48} />
							<Skeleton height={120} />
						</div>
					) : (
						<form
							onSubmit={handleSubmit}
							className={styles.formGrid}>
							<MaskedInput
								label="CNPJ"
								value={tenant?.cnpj ? maskCNPJ(tenant.cnpj) : ""}
								onChange={() => {}}
								disabled
								hint="O CNPJ é fixo e identifica seu tenant de forma única"
							/>
							<Input
								label="Nome fantasia"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								error={error ?? undefined}
							/>

							<div>
								<div className={styles.sectionTitle}>Plano</div>
								<div className={styles.planGrid}>
									{PLANS.map((p) => (
										<button
											key={p.value}
											type="button"
											className={[
												styles.planCard,
												plan === p.value ? styles.planCardActive : "",
											]
												.filter(Boolean)
												.join(" ")}
											onClick={() => setPlan(p.value)}
											aria-pressed={plan === p.value}>
											{plan === p.value ? (
												<span className={styles.planCheck}>
													<CheckCircleIcon fontSize="small" />
												</span>
											) : null}
											<span className={styles.planLabel}>{p.label}</span>
											<span className={styles.planPrice}>{p.price}</span>
											<span className={styles.planDesc}>{p.desc}</span>
										</button>
									))}
								</div>
							</div>

							<div className={styles.actions}>
								<Button
									type="submit"
									loading={saving}>
									Salvar alterações
								</Button>
							</div>
						</form>
					)}
				</Card>

				<Card
					title="Identidade"
					subtitle="Metadados do tenant">
					{loading || !tenant ? (
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<Skeleton height={20} />
							<Skeleton height={20} />
							<Skeleton height={20} />
						</div>
					) : (
						<div className={styles.infoList}>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>Tenant ID</span>
								<span className={styles.infoValue}>
									{tenant.id.slice(0, 8)}…
								</span>
							</div>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>Plano ativo</span>
								<span className={styles.infoValue}>{tenant.plan}</span>
							</div>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>Criado em</span>
								<span className={styles.infoValue}>
									{formatDateTime(tenant.createdAt)}
								</span>
							</div>
							<div className={styles.infoRow}>
								<span className={styles.infoLabel}>Última atualização</span>
								<span className={styles.infoValue}>
									{formatDateTime(tenant.updatedAt)}
								</span>
							</div>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
