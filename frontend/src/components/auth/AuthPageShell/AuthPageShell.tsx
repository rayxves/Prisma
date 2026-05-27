"use client";

import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import styles from "./AuthPageShell.module.css";

interface BrandContent {
	eyebrow: string;
	headline: ReactNode;
	tagline: string;
	features?: string[];
}

interface AuthPageShellProps {
	brand: BrandContent;
	formEyebrow: string;
	formTitle: string;
	formSubtitle: string;
	children: ReactNode;
}

export function AuthPageShell({
	brand,
	formEyebrow,
	formTitle,
	formSubtitle,
	children,
}: AuthPageShellProps) {
	return (
		<div className={styles.shell}>
		<div className={styles.page}>
			<aside className={styles.brandSide}>
				<div className={styles.brandTop}>
					<div
						className={styles.brandMark}
						aria-hidden="true">
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none">
							<path
								d="M4 20 L12 4 L20 20 Z"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinejoin="round"
							/>
							<path
								d="M4 20 L12 12 L20 20"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinejoin="round"
							/>
							<path
								d="M12 4 L12 12"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<span className={styles.brandName}>PRISMA</span>
					<span className={styles.brandVersion}>v1.0</span>
				</div>

				<div className={styles.brandBody}>
					<div className={styles.eyebrowBlock}>
						<span className={styles.eyebrowLine} />
						<span className={styles.eyebrow}>{brand.eyebrow}</span>
					</div>
					<h1 className={styles.headline}>{brand.headline}</h1>
					<p className={styles.tagline}>{brand.tagline}</p>
					{brand.features && (
						<ul className={styles.features}>
							{brand.features.map((f) => (
								<li key={f}>
									<span className={styles.featureDot} />
									<span>{f}</span>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className={styles.brandFooter}>
					<span className={styles.signature}>Prisma BI</span>
					<span className={styles.signatureDot}>·</span>
					<span className={styles.signatureMuted}>
						cérebro analítico para varejo
					</span>
				</div>
			</aside>

			<section className={styles.formSide}>
				<div className={styles.themeCorner}>
					<ThemeToggle />
				</div>
				<div className={styles.formCard}>
					<div className={styles.formHeader}>
						<span className={styles.formEyebrow}>{formEyebrow}</span>
						<h2 className={styles.formTitle}>{formTitle}</h2>
						<p className={styles.formSubtitle}>{formSubtitle}</p>
					</div>
					{children}
				</div>
			</section>
		</div>
		</div>
	);
}
