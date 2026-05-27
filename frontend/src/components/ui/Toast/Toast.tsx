"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import { useToast } from "@/hooks/useToast";
import type { Toast as ToastModel, ToastType } from "@/contexts/ToastContext";
import styles from "./Toast.module.css";

const ICONS: Record<ToastType, typeof CheckCircleIcon> = {
	success: CheckCircleIcon,
	error: ErrorIcon,
	warning: WarningIcon,
	info: InfoIcon,
};

function ToastItem({
	toast,
	onDismiss,
}: {
	toast: ToastModel;
	onDismiss: (id: string) => void;
}) {
	const Icon = ICONS[toast.type];
	return (
		<div
			className={`${styles.toast} ${styles[toast.type]}`}
			role="alert"
			aria-live="polite">
			<span className={styles.icon}>
				<Icon fontSize="small" />
			</span>
			<span className={styles.message}>{toast.message}</span>
			<button
				type="button"
				className={styles.close}
				aria-label="Fechar notificação"
				onClick={() => onDismiss(toast.id)}>
				<CloseIcon fontSize="small" />
			</button>
			<span className={styles.progress} />
		</div>
	);
}

export function ToastViewport() {
	const { toasts, dismiss } = useToast();
	if (toasts.length === 0) return null;
	return (
		<div
			className={styles.container}
			aria-live="polite">
			{toasts.map((toast) => (
				<ToastItem
					key={toast.id}
					toast={toast}
					onDismiss={dismiss}
				/>
			))}
		</div>
	);
}
