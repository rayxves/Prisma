"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar/Sidebar";
import { Header } from "@/components/layout/Header/Header";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [loading, user, router]);

	if (loading || !user) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--color-primary)",
				}}>
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className={styles.shell}>
			<Sidebar
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((c) => !c)}
				mobileOpen={mobileOpen}
				onMobileClose={() => setMobileOpen(false)}
			/>
			<div
				className={[styles.main, collapsed ? styles.mainCollapsed : ""]
					.filter(Boolean)
					.join(" ")}>
				<Header onMobileMenuOpen={() => setMobileOpen(true)} />
				<main className={styles.content}>{children}</main>
			</div>
		</div>
	);
}
