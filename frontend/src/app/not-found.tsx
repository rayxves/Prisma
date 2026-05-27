"use client";

import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Button } from "@/components/ui/Button/Button";
import styles from "./error-pages.module.css";

export default function NotFound() {
	return (
		<div className={styles.page}>
			<svg
				className={styles.illustration}
				viewBox="0 0 200 200"
				fill="none"
				xmlns="http://www.w3.org/2000/svg">
				<path
					d="M40 160 L100 40 L160 160 Z"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinejoin="round"
				/>
				<path
					d="M40 160 L100 100 L160 160"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinejoin="round"
				/>
				<path
					d="M100 40 L100 100"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinejoin="round"
				/>
				<text
					x="100"
					y="135"
					textAnchor="middle"
					fontFamily="var(--font-display)"
					fontSize="32"
					fontWeight="800"
					fill="currentColor">
					404
				</text>
			</svg>
			<div className={styles.code}>Erro 404 · Recurso não encontrado</div>
			<h1 className={styles.title}>Página não encontrada</h1>
			<p className={styles.description}>
				O endereço que você acessou não existe ou foi removido. Verifique a URL
				ou volte para o dashboard.
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
