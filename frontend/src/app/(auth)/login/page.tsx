"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { AuthPageShell } from "@/components/auth/AuthPageShell/AuthPageShell";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";
import styles from "./login.module.css";

interface FormErrors {
	email?: string;
	password?: string;
}

export default function LoginPage() {
	const router = useRouter();
	const { login } = useAuth();
	const toast = useToast();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [loading, setLoading] = useState(false);

	function validate(): boolean {
		const next: FormErrors = {};
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			next.email = "E-mail inválido";
		if (password.length < 1) next.password = "Senha obrigatória";
		setErrors(next);
		return Object.keys(next).length === 0;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await login(email.toLowerCase().trim(), password);
			toast.success("Bem-vindo de volta");
			router.push("/dashboard");
			router.refresh();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Falha ao entrar";
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthPageShell
			brand={{
				eyebrow: "Business Intelligence",
				headline: (
					<>
						Inteligência que
						<span> transforma</span> dados em decisão.
					</>
				),
				tagline:
					"ROI real, anomalias detectadas automaticamente e projeções estatísticas para a sua rede de varejo. Tudo unificado em um único cérebro analítico.",
			}}
			formEyebrow="Acesso"
			formTitle="Entrar na plataforma"
			formSubtitle="Use suas credenciais de acesso.">
			<form
				className={styles.form}
				onSubmit={handleSubmit}
				noValidate>
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
					autoComplete="current-password"
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
					Entrar na plataforma
				</Button>
			</form>

			<div className={styles.formFooter}>
				<span className={styles.footerDot} />
				Acesso multi-tenant · Dados isolados por CNPJ
			</div>

			<div
				style={{
					textAlign: "center",
					fontSize: 13,
					color: "var(--color-text-secondary)",
				}}>
				Não tem conta?{" "}
				<Link
					href="/register"
					style={{ color: "var(--color-primary)", fontWeight: 600 }}>
					Criar conta
				</Link>
			</div>
		</AuthPageShell>
	);
}
