import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends Omit<
	HTMLAttributes<HTMLDivElement>,
	"title"
> {
	title?: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	compact?: boolean;
	elevated?: boolean;
	interactive?: boolean;
	fillBody?: boolean;
}

export function Card({
	title,
	subtitle,
	actions,
	compact = false,
	elevated = false,
	interactive = false,
	fillBody = false,
	className,
	children,
	...rest
}: CardProps) {
	const classes = [
		styles.card,
		compact ? styles.compact : "",
		elevated ? styles.elevated : "",
		interactive ? styles.interactive : "",
		fillBody ? styles.cardFill : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={classes}
			{...rest}>
			{title || actions ? (
				<div className={styles.header}>
					<div>
						{title ? <div className={styles.title}>{title}</div> : null}
						{subtitle ? (
							<div className={styles.subtitle}>{subtitle}</div>
						) : null}
					</div>
					{actions ? <div>{actions}</div> : null}
				</div>
			) : null}
			<div className={[styles.body, fillBody ? styles.bodyFill : ""].filter(Boolean).join(" ")}>{children}</div>
		</div>
	);
}
