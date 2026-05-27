import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
	| "neutral"
	| "primary"
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "muted";

export interface BadgeProps {
	variant?: BadgeVariant;
	pulsing?: boolean;
	children: ReactNode;
}

export function Badge({
	variant = "neutral",
	pulsing = false,
	children,
}: BadgeProps) {
	const classes = [styles.badge, styles[variant], pulsing ? styles.pulsing : ""]
		.filter(Boolean)
		.join(" ");
	return <span className={classes}>{children}</span>;
}
