import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	function Button(
		{
			variant = "primary",
			size = "md",
			loading = false,
			leftIcon,
			rightIcon,
			disabled,
			children,
			className,
			type = "button",
			...rest
		},
		ref,
	) {
		const classes = [styles.button, styles[variant], styles[size], className]
			.filter(Boolean)
			.join(" ");

		return (
			<button
				ref={ref}
				type={type}
				disabled={disabled || loading}
				className={classes}
				aria-busy={loading}
				{...rest}>
				<span className={`${styles.content} ${loading ? styles.hidden : ""}`}>
					{leftIcon ? (
						<span className={styles.iconLeft}>{leftIcon}</span>
					) : null}
					{children}
					{rightIcon ? (
						<span className={styles.iconRight}>{rightIcon}</span>
					) : null}
				</span>
				{loading ? (
					<span className={styles.spinnerWrap}>
						<Spinner size={size === "lg" ? "md" : "sm"} />
					</span>
				) : null}
			</button>
		);
	},
);
