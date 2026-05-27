"use client";

import {
	createContext,
	useCallback,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import type { Theme } from "@/types";

interface ThemeContextValue {
	theme: Theme;
	toggleTheme: () => void;
	setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
	undefined,
);

const STORAGE_KEY = "prisma-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("light");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial: Theme =
			stored ??
			(window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light");
		setThemeState(initial);
		document.documentElement.setAttribute("data-theme", initial);
	}, []);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		localStorage.setItem(STORAGE_KEY, next);
		document.documentElement.setAttribute("data-theme", next);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme(theme === "light" ? "dark" : "light");
	}, [theme, setTheme]);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}
