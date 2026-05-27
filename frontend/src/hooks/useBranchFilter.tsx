"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BranchFilterContextValue {
	selectedBranchId: string | null;
	setSelectedBranchId: (id: string | null) => void;
}

const BranchFilterContext = createContext<BranchFilterContextValue | undefined>(
	undefined,
);

export function BranchFilterProvider({ children }: { children: ReactNode }) {
	const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
	return (
		<BranchFilterContext.Provider
			value={{ selectedBranchId, setSelectedBranchId }}>
			{children}
		</BranchFilterContext.Provider>
	);
}

export function useBranchFilter() {
	const ctx = useContext(BranchFilterContext);
	if (!ctx)
		throw new Error("useBranchFilter must be used within BranchFilterProvider");
	return ctx;
}
