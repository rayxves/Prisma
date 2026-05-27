import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}

export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: PageHeaderProps) {
	return (
		<div className={styles.pageHeader}>
			<div className={styles.titleBlock}>
				{eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
				<h1 className={styles.title}>{title}</h1>
				{description ? (
					<p className={styles.description}>{description}</p>
				) : null}
			</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</div>
	);
}
