"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { MaskedInput } from "@/components/forms/MaskedInput/MaskedInput";
import { AuthPageShell } from "@/components/auth/AuthPageShell/AuthPageShell";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/auth.service";
import { unmaskCNPJ } from "@/services/format";
import styles from "./register.module.css";

interface FormErrors {
	companyName?: string;
	cnpj?: string;
	adminName?: string;
	email?: string;
	password?: string;
}

export default function RegisterPage() {
	const router = useRouter();
	const { login } = useAuth();
	const toast = useToast();

	const [companyName, setCompanyName] = useState("");
	const [cnpj, setCnpj] = useState("");
	const [adminName, setAdminName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [loading, setLoading] = useState(false);

	function validate(): boolean {
		const next: FormErrors = {};
		if (companyName.trim().length < 2)
			next.companyName = "Nome da empresa muito curto";
		if (companyName.trim().length > 150)
			next.companyName = "Nome muito longo (máx 150)";

		const rawCnpj = unmaskCNPJ(cnpj);
		if (rawCnpj.length !== 14) next.cnpj = "CNPJ deve ter 14 dígitos";

		if (adminName.trim().length < 2) next.adminName = "Nome muito curto";
		if (adminName.trim().length > 100)
			next.adminName = "Nome muito longo (máx 100)";

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			next.email = "E-mail inválido";

		if (password.length < 8)
			next.password = "Senha deve ter no mínimo 8 caracteres";
		else if (!/[A-Z]/.test(password))
			next.password = "Senha deve conter uma letra maiúscula";
		else if (!/[0-9]/.test(password))
			next.password = "Senha deve conter um número";

		setErrors(next);
		return Object.keys(next).length === 0;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		const rawCnpj = unmaskCNPJ(cnpj);
		const normalizedEmail = email.toLowerCase().trim();
		try {
			await authService.register({
				companyName: companyName.trim(),
				cnpj: rawCnpj,
				adminName: adminName.trim(),
				email: normalizedEmail,
				password,
			});
			toast.success("Conta criada com sucesso. Entrando...");
			await login(rawCnpj, normalizedEmail, password);
			router.push("/dashboard");
			router.refresh();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Falha ao criar conta";
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthPageShell
			brand={{
				eyebrow: "Comece agora",
				headline: (
					<>
						Sua rede de varejo <span>merece</span> mais clareza.
					</>
				),
				tagline:
					"Crie sua conta em 1 minuto. Seu CNPJ identifica sua empresa de forma única e isola todos os seus dados dos demais clientes.",
				features: [
					"Dashboard com ROI, margem e projeções em tempo real",
					"Detecção automática de anomalias nas vendas",
					"Multi-filial com ranking e atingimento de meta",
					"Importação via CSV/Excel com mapeamento inteligente",
				],
			}}
			formEyebrow="Criar conta"
			formTitle="Vamos começar."
			formSubtitle="Cadastre sua empresa e o primeiro usuário administrador.">
			<form
				className={styles.form}
				onSubmit={handleSubmit}
				noValidate>
				<Input
					label="Nome da empresa"
					required
					placeholder="Acme Ltda"
					value={companyName}
					onChange={(e) => setCompanyName(e.target.value)}
					error={errors.companyName}
					autoComplete="organization"
					maxLength={150}
				/>
				<MaskedInput
					label="CNPJ"
					required
					placeholder="00.000.000/0000-00"
					value={cnpj}
					onChange={(formatted) => setCnpj(formatted)}
					error={errors.cnpj}
				/>
				<Input
					label="Seu nome"
					required
					placeholder="Maria Silva"
					value={adminName}
					onChange={(e) => setAdminName(e.target.value)}
					error={errors.adminName}
					autoComplete="name"
					maxLength={100}
				/>
				<Input
					label="E-mail"
					required
					type="email"
					placeholder="seu@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					error={errors.email}
					autoComplete="email"
				/>
				<Input
					label="Senha"
					required
					type={showPassword ? "text" : "password"}
					placeholder="••••••••"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={errors.password}
					hint="Mínimo 8 caracteres, com uma maiúscula e um número"
					autoComplete="new-password"
					rightAction={
						<button
							type="button"
							className={styles.eyeBtn}
							onClick={() => setShowPassword((v) => !v)}
							aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
							{showPassword ? (
								<VisibilityOffIcon fontSize="small" />
							) : (
								<VisibilityIcon fontSize="small" />
							)}
						</button>
					}
				/>
				<Button
					type="submit"
					size="lg"
					loading={loading}
					rightIcon={<ArrowForwardIcon fontSize="small" />}>
					Criar conta e entrar
				</Button>
			</form>

			<div className={styles.formFooter}>
				<Link
					href="/login"
					className={styles.backLink}>
					<ArrowBackIcon fontSize="inherit" />
					Já tenho conta · Entrar
				</Link>
			</div>
		</AuthPageShell>
	);
}
