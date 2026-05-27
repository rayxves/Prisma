"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import StorefrontIcon from "@mui/icons-material/Storefront";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GroupIcon from "@mui/icons-material/Group";
import BusinessIcon from "@mui/icons-material/Business";
import HistoryIcon from "@mui/icons-material/History";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/hooks/useAuth";
import { anomaliesService } from "@/services/anomalies.service";
import styles from "./Sidebar.module.css";

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{
		fontSize?: "inherit" | "small" | "medium" | "large";
	}>;
	adminOnly?: boolean;
	showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
	{ href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
	{ href: "/uploads", label: "Uploads", icon: UploadFileIcon },
	{ href: "/branches", label: "Filiais", icon: StorefrontIcon },
	{
		href: "/anomalies",
		label: "Anomalias",
		icon: WarningAmberIcon,
		showBadge: true,
	},
	{ href: "/metrics", label: "Métricas", icon: BarChartIcon },
	{ href: "/reports", label: "Relatórios", icon: AssessmentIcon },
	{ href: "/users", label: "Usuários", icon: GroupIcon, adminOnly: true },
	{ href: "/tenant", label: "Empresa", icon: BusinessIcon, adminOnly: true },
	{
		href: "/audit-logs",
		label: "Audit Logs",
		icon: HistoryIcon,
		adminOnly: true,
	},
];

export interface SidebarProps {
	collapsed: boolean;
	onToggleCollapse: () => void;
	mobileOpen: boolean;
	onMobileClose: () => void;
}

function PrismLogo() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true">
			<path
				d="M4 20 L12 4 L20 20 Z"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
			<path
				d="M4 20 L12 12 L20 20"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
			<path
				d="M12 4 L12 12"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function userInitials(name?: string) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({
	collapsed,
	onToggleCollapse,
	mobileOpen,
	onMobileClose,
}: SidebarProps) {
	const pathname = usePathname();
	const { user, logout } = useAuth();
	const [anomaliesCount, setAnomaliesCount] = useState<number>(0);

	useEffect(() => {
		let cancelled = false;
		anomaliesService
			.list()
			.then((list) => {
				if (!cancelled) setAnomaliesCount(list.length);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [pathname]);

	const items = NAV_ITEMS.filter(
		(item) => !item.adminOnly || user?.role === "ADMIN",
	);

	return (
		<>
			{mobileOpen ? (
				<div
					className={styles.mobileOverlay}
					onClick={onMobileClose}
				/>
			) : null}
			<aside
				className={[
					styles.sidebar,
					collapsed ? styles.collapsed : "",
					mobileOpen ? styles.sidebarOpen : "",
				]
					.filter(Boolean)
					.join(" ")}>
				<div className={styles.brand}>
					<div className={styles.brandLogo}>
						<PrismLogo />
					</div>
					<div className={styles.brandText}>
						<span className={styles.brandName}>PRISMA</span>
						<span className={styles.brandTagline}>Analytics</span>
					</div>
					<button
						type="button"
						className={styles.collapseBtn}
						onClick={onToggleCollapse}
						aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
						{collapsed ? (
							<MenuIcon fontSize="small" />
						) : (
							<ChevronLeftIcon fontSize="small" />
						)}
					</button>
				</div>

				<nav
					className={styles.nav}
					aria-label="Navegação principal">
					<div className={styles.section}>Análise</div>
					{items.slice(0, 6).map((item) => {
						const Icon = item.icon;
						const active =
							pathname === item.href || pathname.startsWith(`${item.href}/`);
						const showBadge = item.showBadge && anomaliesCount > 0;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={[styles.navLink, active ? styles.navLinkActive : ""]
									.filter(Boolean)
									.join(" ")}
								aria-current={active ? "page" : undefined}
								onClick={onMobileClose}
								title={collapsed ? item.label : undefined}>
								<span className={styles.navIcon}>
									<Icon fontSize="small" />
								</span>
								<span className={styles.navLabel}>{item.label}</span>
								{showBadge ? (
									<span className={styles.navBadge}>{anomaliesCount}</span>
								) : null}
							</Link>
						);
					})}
					{items.length > 6 ? (
						<>
							<div className={styles.section}>Administração</div>
							{items.slice(6).map((item) => {
								const Icon = item.icon;
								const active =
									pathname === item.href ||
									pathname.startsWith(`${item.href}/`);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={[
											styles.navLink,
											active ? styles.navLinkActive : "",
										]
											.filter(Boolean)
											.join(" ")}
										aria-current={active ? "page" : undefined}
										onClick={onMobileClose}
										title={collapsed ? item.label : undefined}>
										<span className={styles.navIcon}>
											<Icon fontSize="small" />
										</span>
										<span className={styles.navLabel}>{item.label}</span>
									</Link>
								);
							})}
						</>
					) : null}
				</nav>

				<div className={styles.footer}>
					<div className={styles.avatar}>{userInitials(user?.name)}</div>
					<div className={styles.userInfo}>
						<span className={styles.userName}>{user?.name ?? "Convidado"}</span>
						<span className={styles.userRole}>{user?.role ?? ""}</span>
					</div>
					<button
						type="button"
						className={styles.logout}
						onClick={logout}
						aria-label="Sair">
						<LogoutIcon fontSize="small" />
					</button>
				</div>
			</aside>
		</>
	);
}
