import {
	forwardRef,
	useId,
	type InputHTMLAttributes,
	type ReactNode,
} from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
	required?: boolean;
	rightAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ label, error, hint, required, rightAction, id, className, ...rest },
	ref,
) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const wrapClasses = [
		styles.field,
		error ? styles.error : "",
		rightAction ? styles.hasRightIcon : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapClasses}>
			{label ? (
				<label
					htmlFor={inputId}
					className={styles.label}>
					{label}
					{required ? <span className={styles.required}>*</span> : null}
				</label>
			) : null}
			<div className={styles.inputWrap}>
				<input
					ref={ref}
					id={inputId}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? `${inputId}-err` : undefined}
					className={styles.input}
					{...rest}
				/>
				{rightAction ? (
					<div className={styles.rightAction}>{rightAction}</div>
				) : null}
			</div>
			<div className={styles.message}>
				{error ? (
					<span
						id={`${inputId}-err`}
						className={styles.errorMsg}
						role="alert">
						{error}
					</span>
				) : hint ? (
					<span className={styles.hint}>{hint}</span>
				) : null}
			</div>
		</div>
	);
});
