"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import styles from "./Drawer.module.css";

export interface DrawerProps {
	open: boolean;
	onClose: () => void;
	title?: ReactNode;
	subtitle?: ReactNode;
	children: ReactNode;
}

export function Drawer({
	open,
	onClose,
	title,
	subtitle,
	children,
}: DrawerProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	if (!open || typeof window === "undefined") return null;

	return createPortal(
		<>
			<div
				className={styles.backdrop}
				onClick={onClose}
			/>
			<aside
				className={styles.drawer}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? "drawer-title" : undefined}>
				<div className={styles.header}>
					<div>
						{title ? (
							<div
								id="drawer-title"
								className={styles.title}>
								{title}
							</div>
						) : null}
						{subtitle ? (
							<div className={styles.subtitle}>{subtitle}</div>
						) : null}
					</div>
					<button
						type="button"
						className={styles.close}
						onClick={onClose}
						aria-label="Fechar">
						<CloseIcon fontSize="small" />
					</button>
				</div>
				<div className={styles.body}>{children}</div>
			</aside>
		</>,
		document.body,
	);
}
