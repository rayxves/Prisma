"use client";

import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
	type SelectHTMLAttributes,
} from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import styles from "./Select.module.css";

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
	label?: string;
	error?: string;
	hint?: string;
	required?: boolean;
	options: SelectOption[];
	placeholder?: string;
	onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	function Select(
		{
			label,
			error,
			hint,
			required,
			options,
			placeholder,
			id,
			className,
			value,
			onChange,
			disabled,
		},
		_ref,
	) {
		const generatedId = useId();
		const selectId = id ?? generatedId;
		const [open, setOpen] = useState(false);
		const [highlighted, setHighlighted] = useState(-1);
		const containerRef = useRef<HTMLDivElement>(null);
		const listRef = useRef<HTMLUListElement>(null);

		const selectedOption = options.find((o) => o.value === value);
		const displayValue = selectedOption?.label ?? placeholder ?? "";
		const hasValue = selectedOption !== undefined;

		const close = useCallback(() => {
			setOpen(false);
			setHighlighted(-1);
		}, []);

		useEffect(() => {
			if (!open) return;
			function onPointerDown(e: PointerEvent) {
				if (!containerRef.current?.contains(e.target as Node)) close();
			}
			document.addEventListener("pointerdown", onPointerDown);
			return () => document.removeEventListener("pointerdown", onPointerDown);
		}, [open, close]);

		function handleSelect(opt: SelectOption) {
			if (onChange) {
				const synth = { target: { value: opt.value } } as ChangeEvent<HTMLSelectElement>;
				onChange(synth);
			}
			close();
		}

		function handleKeyDown(e: React.KeyboardEvent) {
			if (disabled) return;
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				if (!open) {
					setOpen(true);
					setHighlighted(options.findIndex((o) => o.value === value));
				} else if (highlighted >= 0) {
					handleSelect(options[highlighted]);
				}
			} else if (e.key === "Escape") {
				close();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				if (!open) {
					setOpen(true);
					setHighlighted(0);
				} else {
					setHighlighted((h) => Math.min(h + 1, options.length - 1));
				}
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlighted((h) => Math.max(h - 1, 0));
			}
		}

		useEffect(() => {
			if (!open || highlighted < 0 || !listRef.current) return;
			const item = listRef.current.children[highlighted] as HTMLElement | undefined;
			item?.scrollIntoView({ block: "nearest" });
		}, [open, highlighted]);

		const wrapClasses = [styles.field, error ? styles.error : "", className]
			.filter(Boolean)
			.join(" ");

		return (
			<div className={wrapClasses}>
				{label ? (
					<label
						htmlFor={selectId}
						className={styles.label}>
						{label}
						{required ? <span className={styles.required}>*</span> : null}
					</label>
				) : null}
				<div
					ref={containerRef}
					className={styles.selectWrap}>
					<button
						id={selectId}
						type="button"
						role="combobox"
						aria-expanded={open}
						aria-haspopup="listbox"
						aria-invalid={Boolean(error)}
						disabled={disabled}
						className={[styles.trigger, !hasValue ? styles.triggerPlaceholder : ""].filter(Boolean).join(" ")}
						onClick={() => !disabled && setOpen((o) => !o)}
						onKeyDown={handleKeyDown}>
						<span className={styles.triggerText}>{displayValue}</span>
						<span className={[styles.caret, open ? styles.caretOpen : ""].filter(Boolean).join(" ")}>
							<KeyboardArrowDownIcon fontSize="small" />
						</span>
					</button>

					{open ? (
						<ul
							ref={listRef}
							role="listbox"
							className={styles.dropdown}>
							{options.map((opt, idx) => (
								<li
									key={opt.value}
									role="option"
									aria-selected={opt.value === value}
									className={[
										styles.option,
										opt.value === value ? styles.optionSelected : "",
										idx === highlighted ? styles.optionHighlighted : "",
									]
										.filter(Boolean)
										.join(" ")}
									onPointerDown={(e) => {
										e.preventDefault();
										handleSelect(opt);
									}}
									onPointerEnter={() => setHighlighted(idx)}>
									{opt.label}
								</li>
							))}
						</ul>
					) : null}
				</div>
				{(error || hint) ? (
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
				) : null}
			</div>
		);
	},
);
