"use client";

import "react-day-picker/style.css";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import type { Matcher } from "react-day-picker";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import styles from "./DatePicker.module.css";

function isoToDate(iso: string): Date {
	const parts = iso.split("-").map(Number);
	return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

function dateToIso(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}/${m}/${y}`;
}

interface DatePickerProps {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	min?: string;
	max?: string;
}

export function DatePicker({ label, value, onChange, min, max }: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}

		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}

		document.addEventListener("mousedown", handleClick);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleKey);
		};
	}, [open]);

	const selected = value ? isoToDate(value) : undefined;
	const disabled: Matcher[] = [];
	if (min) disabled.push({ before: isoToDate(min) });
	if (max) disabled.push({ after: isoToDate(max) });

	return (
		<div
			className={styles.root}
			ref={ref}>
			{label && <label className={styles.label}>{label}</label>}
			<button
				type="button"
				className={styles.trigger}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="dialog">
				<CalendarTodayIcon
					className={styles.icon}
					sx={{ fontSize: 14 }}
				/>
				<span>
					{value ? (
						formatDisplay(value)
					) : (
						<span className={styles.placeholder}>DD/MM/AAAA</span>
					)}
				</span>
			</button>
			{open && (
				<div
					className={styles.popover}
					role="dialog"
					aria-modal="true">
					<DayPicker
						mode="single"
						selected={selected}
						onSelect={(date) => {
							if (date) {
								onChange(dateToIso(date));
								setOpen(false);
							}
						}}
						disabled={disabled}
						locale={ptBR}
					/>
				</div>
			)}
		</div>
	);
}
