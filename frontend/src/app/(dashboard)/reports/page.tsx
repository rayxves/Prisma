"use client";

import { useEffect, useState } from "react";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import DownloadIcon from "@mui/icons-material/Download";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { branchesService } from "@/services/branches.service";
import { reportsService } from "@/services/reports.service";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/services/format";
import type { Branch } from "@/types";
import styles from "./reports.module.css";

function isoToday() {
	return new Date().toISOString().split("T")[0];
}

function isoMonthStart() {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

export default function ReportsPage() {
	const toast = useToast();
	const { selectedBranchId, setSelectedBranchId } = useBranchFilter();

	const [branches, setBranches] = useState<Branch[]>([]);
	const [from, setFrom] = useState(isoMonthStart());
	const [to, setTo] = useState(isoToday());
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const [downloadingExcel, setDownloadingExcel] = useState(false);

	useEffect(() => {
		branchesService
			.list()
			.then(setBranches)
			.catch(() => {});
	}, []);

	async function handleDownload(kind: "pdf" | "excel") {
		const fromIso = new Date(from).toISOString();
		const toIso = new Date(`${to}T23:59:59`).toISOString();
		const params = {
			...(selectedBranchId ? { branchId: selectedBranchId } : {}),
			from: fromIso,
			to: toIso,
		};
		try {
			if (kind === "pdf") {
				setDownloadingPdf(true);
				await reportsService.downloadPdf(params);
				toast.success("Relatório PDF gerado");
			} else {
				setDownloadingExcel(true);
				await reportsService.downloadExcel(params);
				toast.success("Planilha Excel gerada");
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Falha ao gerar relatório",
			);
		} finally {
			setDownloadingPdf(false);
			setDownloadingExcel(false);
		}
	}

	const branchName = selectedBranchId
		? (branches.find((b) => b.id === selectedBranchId)?.name ??
			"Filial selecionada")
		: "Todas as filiais";

	return (
		<div>
			<PageHeader
				eyebrow="Exportação"
				title="Relatórios"
				description="Gere documentos prontos para apresentar em reuniões ou compartilhar com a equipe."
			/>

			<div className={styles.grid}>
				<Card
					title="Configurar exportação"
					subtitle="Defina o escopo do relatório">
					<div className={styles.formGrid}>
						<div className={styles.formFull}>
							<Select
								label="Filial"
								placeholder="Todas as filiais"
								value={selectedBranchId ?? ""}
								onChange={(e) => setSelectedBranchId(e.target.value || null)}
								options={[
									{ value: "", label: "Todas as filiais" },
									...branches.map((b) => ({
										value: b.id,
										label: `${b.name} (${b.city}/${b.state})`,
									})),
								]}
							/>
						</div>
						<DatePicker
							label="Data inicial"
							value={from}
							max={to}
							onChange={setFrom}
						/>
						<DatePicker
							label="Data final"
							value={to}
							min={from}
							max={isoToday()}
							onChange={setTo}
						/>
					</div>

					<div className={styles.downloadGrid}>
						<div className={styles.downloadCard}>
							<div className={`${styles.downloadIcon} ${styles.iconPdf}`}>
								<PictureAsPdfIcon fontSize="inherit" />
							</div>
							<div>
								<div className={styles.downloadTitle}>Relatório PDF</div>
								<div className={styles.downloadDesc}>
									Documento executivo com gráficos, KPIs e anomalias do período.
								</div>
							</div>
							<Button
								leftIcon={<DownloadIcon fontSize="small" />}
								onClick={() => handleDownload("pdf")}
								loading={downloadingPdf}>
								Baixar PDF
							</Button>
						</div>

						<div className={styles.downloadCard}>
							<div className={`${styles.downloadIcon} ${styles.iconExcel}`}>
								<TableChartIcon fontSize="inherit" />
							</div>
							<div>
								<div className={styles.downloadTitle}>Planilha Excel</div>
								<div className={styles.downloadDesc}>
									Dados granulares: vendas, métricas diárias e anomalias
									detalhadas.
								</div>
							</div>
							<Button
								variant="secondary"
								leftIcon={<DownloadIcon fontSize="small" />}
								onClick={() => handleDownload("excel")}
								loading={downloadingExcel}>
								Baixar Excel
							</Button>
						</div>
					</div>
				</Card>

				<Card
					title="Conteúdo incluído"
					subtitle="Pré-visualização do escopo">
					<div className={styles.previewBlock}>
						<ul>
							<li>
								Escopo: <strong>{branchName}</strong>
							</li>
							<li>
								Período: <strong>{formatDate(from)}</strong> →{" "}
								<strong>{formatDate(to)}</strong>
							</li>
							<li>KPIs consolidados (receita, lucro, ROI, margem)</li>
							<li>Métricas diárias com tendência</li>
							<li>Ranking de filiais e top produtos</li>
							<li>Anomalias e hipóteses geradas</li>
							<li>Projeção do mês corrente</li>
						</ul>
					</div>
				</Card>
			</div>
		</div>
	);
}
