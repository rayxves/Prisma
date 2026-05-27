"use client";

import {
	forwardRef,
	useId,
	type ChangeEvent,
	type InputHTMLAttributes,
} from "react";
import { maskCNPJ } from "@/services/format";
import styles from "../../ui/Input/Input.module.css";

export interface MaskedInputProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"onChange" | "value"
> {
	label?: string;
	error?: string;
	hint?: string;
	required?: boolean;
	value: string;
	onChange: (formatted: string, raw: string) => void;
	mask?: "cnpj";
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
	function MaskedInput(
		{
			label,
			error,
			hint,
			required,
			value,
			onChange,
			mask = "cnpj",
			id,
			className,
			...rest
		},
		ref,
	) {
		const generatedId = useId();
		const inputId = id ?? generatedId;
		const wrapClasses = [styles.field, error ? styles.error : "", className]
			.filter(Boolean)
			.join(" ");

		const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
			const formatted =
				mask === "cnpj" ? maskCNPJ(e.target.value) : e.target.value;
			const raw = formatted.replace(/\D/g, "");
			onChange(formatted, raw);
		};

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
						className={styles.input}
						value={value}
						onChange={handleChange}
						inputMode="numeric"
						autoComplete="off"
						{...rest}
					/>
				</div>
				<div className={styles.message}>
					{error ? (
						<span
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
	},
);
