"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import styles from "./Modal.module.css";

export interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: ReactNode;
	subtitle?: ReactNode;
	footer?: ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
	children: ReactNode;
	closeOnBackdrop?: boolean;
}

const FOCUSABLE =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
	open,
	onClose,
	title,
	subtitle,
	footer,
	size = "md",
	children,
	closeOnBackdrop = true,
}: ModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const previouslyFocused = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) return;
		previouslyFocused.current = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";

		requestAnimationFrame(() => {
			const root = modalRef.current;
			if (!root) return;
			const firstInput = root.querySelector<HTMLElement>(
				"input:not([disabled]):not([type='hidden']), textarea:not([disabled]), select:not([disabled])",
			);
			(firstInput ?? root.querySelector<HTMLElement>(FOCUSABLE))?.focus();
		});

		return () => {
			document.body.style.overflow = "";
			previouslyFocused.current?.focus();
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			} else if (e.key === "Tab" && modalRef.current) {
				const focusables = Array.from(
					modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
				).filter((el) => !el.hasAttribute("disabled"));
				if (focusables.length === 0) return;
				const first = focusables[0];
				const last = focusables[focusables.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open || typeof window === "undefined") return null;

	return createPortal(
		<div
			className={styles.backdrop}
			onClick={(e) => {
				if (e.target === e.currentTarget && closeOnBackdrop) onClose();
			}}>
			<div
				ref={modalRef}
				className={`${styles.modal} ${styles[size]}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? "modal-title" : undefined}>
				{title || onClose ? (
					<div className={styles.header}>
						<div>
							{title ? (
								<div
									id="modal-title"
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
				) : null}
				<div className={styles.body}>{children}</div>
				{footer ? <div className={styles.footer}>{footer}</div> : null}
			</div>
		</div>,
		document.body,
	);
}
