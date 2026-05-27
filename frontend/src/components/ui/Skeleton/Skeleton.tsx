import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
	width?: number | string;
	height?: number | string;
	rounded?: boolean;
	className?: string;
	style?: CSSProperties;
}

export function Skeleton({
	width,
	height,
	rounded = false,
	className,
	style,
}: SkeletonProps) {
	const inline: CSSProperties = {
		width: typeof width === "number" ? `${width}px` : width,
		height: typeof height === "number" ? `${height}px` : height,
		...style,
	};
	return (
		<span
			className={[styles.skeleton, rounded ? styles.rounded : "", className]
				.filter(Boolean)
				.join(" ")}
			style={inline}
			aria-hidden="true"
		/>
	);
}
