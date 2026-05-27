"use client";

import Link from "next/link";
import LockIcon from "@mui/icons-material/Lock";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Button } from "@/components/ui/Button/Button";
import styles from "../error-pages.module.css";

export default function ForbiddenPage() {
	return (
		<div className={styles.page}>
			<div
				className={styles.illustration}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}>
				<LockIcon style={{ fontSize: 140 }} />
			</div>
			<div className={styles.code}>Erro 403 · Permissão insuficiente</div>
			<h1 className={styles.title}>Acesso restrito</h1>
			<p className={styles.description}>
				Esta área é restrita a administradores do tenant. Se você acredita que
				deveria ter acesso, peça a um administrador para revisar suas
				permissões.
			</p>
			<div className={styles.actions}>
				<Link href="/dashboard">
					<Button leftIcon={<ArrowBackIcon fontSize="small" />}>
						Voltar ao dashboard
					</Button>
				</Link>
			</div>
		</div>
	);
}
