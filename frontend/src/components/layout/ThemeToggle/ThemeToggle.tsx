"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useTheme } from "@/hooks/useTheme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<button
			type="button"
			className={styles.button}
			onClick={toggleTheme}
			aria-label={
				theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
			}
			title={theme === "light" ? "Modo escuro" : "Modo claro"}>
			{theme === "light" ? (
				<DarkModeIcon fontSize="small" />
			) : (
				<LightModeIcon fontSize="small" />
			)}
		</button>
	);
}
