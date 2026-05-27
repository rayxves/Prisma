"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { BranchFilterProvider } from "@/hooks/useBranchFilter";
import { ToastViewport } from "@/components/ui/Toast/Toast";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<ToastProvider>
				<AuthProvider>
					<BranchFilterProvider>
						{children}
						<ToastViewport />
					</BranchFilterProvider>
				</AuthProvider>
			</ToastProvider>
		</ThemeProvider>
	);
}
