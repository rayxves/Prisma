"use client";

import { createContext, useCallback, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

interface ToastContextValue {
	toasts: Toast[];
	show: (type: ToastType, message: string) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	warning: (message: string) => void;
	info: (message: string) => void;
	dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
	undefined,
);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const show = useCallback(
		(type: ToastType, message: string) => {
			const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			setToasts((prev) => {
				const next = [...prev, { id, type, message }];
				return next.slice(-MAX_TOASTS);
			});
			setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
		},
		[dismiss],
	);

	const value: ToastContextValue = {
		toasts,
		show,
		success: (m) => show("success", m),
		error: (m) => show("error", m),
		warning: (m) => show("warning", m),
		info: (m) => show("info", m),
		dismiss,
	};

	return (
		<ToastContext.Provider value={value}>{children}</ToastContext.Provider>
	);
}
