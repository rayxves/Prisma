"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "../Modal/Modal";
import { Button } from "../Button/Button";
import styles from "./ConfirmModal.module.css";

export interface ConfirmModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	title?: ReactNode;
	message: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

export function ConfirmModal({
	open,
	onClose,
	onConfirm,
	title = "Confirmar ação",
	message,
	confirmLabel = "Confirmar",
	cancelLabel = "Cancelar",
	danger = false,
}: ConfirmModalProps) {
	const [loading, setLoading] = useState(false);

	const handleConfirm = async () => {
		setLoading(true);
		try {
			await onConfirm();
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			size="sm"
			footer={
				<>
					<Button
						variant="ghost"
						onClick={onClose}
						disabled={loading}>
						{cancelLabel}
					</Button>
					<Button
						variant={danger ? "danger" : "primary"}
						onClick={handleConfirm}
						loading={loading}>
						{confirmLabel}
					</Button>
				</>
			}>
			<div className={styles.body}>{message}</div>
		</Modal>
	);
}
