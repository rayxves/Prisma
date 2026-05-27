"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { branchesService } from "@/services/branches.service";
import { anomaliesService } from "@/services/anomalies.service";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./Header.module.css";

const ROUTE_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	uploads: "Uploads",
	branches: "Filiais",
	anomalies: "Anomalias",
	metrics: "Métricas",
	reports: "Relatórios",
	users: "Usuários",
	tenant: "Empresa",
	"audit-logs": "Audit Logs",
};

export interface HeaderProps {
	onMobileMenuOpen: () => void;
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
	const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
	const [anomaliesCount, setAnomaliesCount] = useState(0);

	useEffect(() => {
		branchesService
			.list()
			.then((list) =>
				setBranches(list.map((b) => ({ id: b.id, name: b.name }))),
			)
			.catch(() => {});
		anomaliesService
			.list()
			.then((list) => setAnomaliesCount(list.length))
			.catch(() => {});
	}, [pathname]);

	const segments = pathname.split("/").filter(Boolean);
	const crumbs = segments.map((seg, idx) => ({
		label: ROUTE_LABELS[seg] ?? seg,
		href: "/" + segments.slice(0, idx + 1).join("/"),
		active: idx === segments.length - 1,
	}));

	return (
		<header className={styles.header}>
			<button
				type="button"
				className={styles.mobileBtn}
				onClick={onMobileMenuOpen}
				aria-label="Abrir menu">
				<MenuIcon fontSize="small" />
			</button>

			<nav
				className={styles.breadcrumbs}
				aria-label="Navegação">
				<span className={styles.crumb}>Prisma BI</span>
				{crumbs.map((crumb) => (
					<span
						key={crumb.href}
						className={styles.breadcrumbs}>
						<span className={styles.separator}>/</span>
						<span
							className={[styles.crumb, crumb.active ? styles.crumbActive : ""]
								.filter(Boolean)
								.join(" ")}>
							{crumb.label}
						</span>
					</span>
				))}
			</nav>

			<div className={styles.right}>
				<select
					className={styles.branchSelect}
					value={selectedBranchId ?? ""}
					onChange={(e) => setSelectedBranchId(e.target.value || null)}
					aria-label="Filtrar por filial"
					style={{
						height: 36,
						padding: "0 28px 0 12px",
						background: "var(--color-surface-elevated)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						fontSize: 13,
						color: "var(--color-text-primary)",
						appearance: "none",
						cursor: "pointer",
					}}>
					<option value="">Todas as filiais</option>
					{branches.map((b) => (
						<option
							key={b.id}
							value={b.id}>
							{b.name}
						</option>
					))}
				</select>

				<button
					type="button"
					className={styles.iconBtn}
					aria-label={`${anomaliesCount} anomalias pendentes`}
					onClick={() => router.push("/anomalies")}>
					<NotificationsIcon fontSize="small" />
					{anomaliesCount > 0 ? (
						<span className={styles.iconBadge}>
							{anomaliesCount > 99 ? "99+" : anomaliesCount}
						</span>
					) : null}
				</button>

				<ThemeToggle />
			</div>
		</header>
	);
}
