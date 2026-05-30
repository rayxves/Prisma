"use client";

import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
} from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { uploadsService } from "@/services/uploads.service";
import { branchesService } from "@/services/branches.service";
import { useToast } from "@/hooks/useToast";
import { formatDateTime } from "@/services/format";
import type { Branch, Upload, UploadStatus } from "@/types";
import styles from "./uploads.module.css";

const REQUIRED_FIELDS = [
	"data_venda",
	"valor_bruto",
	"custo_total",
	"produto_nome",
	"quantidade",
];
const OPTIONAL_FIELDS = ["categoria", "external_id"];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<string, string> = {
	data_venda: "Data da venda",
	valor_bruto: "Valor bruto",
	custo_total: "Custo total",
	produto_nome: "Produto",
	quantidade: "Quantidade",
	categoria: "Categoria",
	external_id: "ID externo",
};

const MAX_SIZE_MB = 10;
const ACCEPTED = [".csv", ".xlsx", ".xls"];

type Step = 1 | 2 | 3;

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function statusBadge(status: UploadStatus) {
	switch (status) {
		case "PENDING":
			return <Badge variant="muted">Pendente</Badge>;
		case "PROCESSING":
			return (
				<Badge
					variant="info"
					pulsing>
					Processando
				</Badge>
			);
		case "AWAITING_MAPPING":
			return <Badge variant="warning">Aguardando mapeamento</Badge>;
		case "DONE":
			return <Badge variant="success">Concluído</Badge>;
		case "ERROR":
			return <Badge variant="danger">Erro</Badge>;
		default:
			return <Badge variant="neutral">{status}</Badge>;
	}
}

function confidenceClass(score: number) {
	if (score >= 0.8) return styles.confHigh;
	if (score >= 0.5) return styles.confMid;
	return styles.confLow;
}

export default function UploadsPage() {
	const toast = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [step, setStep] = useState<Step>(1);

	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadId, setUploadId] = useState<string | null>(null);

	const [headers, setHeaders] = useState<string[]>([]);
	const [suggested, setSuggested] = useState<Record<string, string>>({});
	const [mapping, setMapping] = useState<Record<string, string>>({});
	const [branchId, setBranchId] = useState<string>("");
	const [branches, setBranches] = useState<Branch[]>([]);
	const [confirming, setConfirming] = useState(false);

	const [processingStatus, setProcessingStatus] = useState<UploadStatus | null>(
		null,
	);
	const [processingError, setProcessingError] = useState<string | null>(null);
	const [showConfetti, setShowConfetti] = useState(false);
	const [dragActive, setDragActive] = useState(false);

	const [uploads, setUploads] = useState<Upload[]>([]);
	const [listLoading, setListLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	function refreshList() {
		setListLoading(true);
		uploadsService
			.list()
			.then(setUploads)
			.catch(() => {})
			.finally(() => setListLoading(false));
	}

	useEffect(() => {
		refreshList();
		branchesService
			.list()
			.then(setBranches)
			.catch(() => {});
	}, []);

	async function handleDelete(id: string) {
		setDeletingId(id);
		try {
			await uploadsService.delete(id);
			toast.success("Upload excluído com sucesso");
			refreshList();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao excluir");
		} finally {
			setDeletingId(null);
		}
	}

	function resetWizard() {
		setStep(1);
		setFile(null);
		setUploadId(null);
		setHeaders([]);
		setSuggested({});
		setMapping({});
		setBranchId("");
		setProcessingStatus(null);
		setProcessingError(null);
		setShowConfetti(false);
	}

	function handleSelectFile(picked: File | null) {
		if (!picked) return;
		const ext = "." + picked.name.split(".").pop()?.toLowerCase();
		if (!ACCEPTED.includes(ext)) {
			toast.error(`Formato inválido. Permitidos: ${ACCEPTED.join(", ")}`);
			return;
		}
		if (picked.size > MAX_SIZE_MB * 1024 * 1024) {
			toast.error(`Arquivo excede ${MAX_SIZE_MB} MB`);
			return;
		}
		setFile(picked);
	}

	async function handleUploadFile() {
		if (!file) return;
		setUploading(true);
		try {
			const res = await uploadsService.upload(file);
			setUploadId(res.uploadId);
			toast.success("Arquivo enviado. Analisando colunas...");
			await pollForMapping(res.uploadId);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha no upload");
		} finally {
			setUploading(false);
		}
	}

	async function pollForMapping(id: string) {
		for (let i = 0; i < 30; i++) {
			try {
				const status = await uploadsService.getById(id);
				if (status.status === "AWAITING_MAPPING") {
					const data = await uploadsService.getMapping(id);

					const rawMap = (data.suggestedMapping ?? {}) as Record<string, string | null>;
					const filteredMap = Object.fromEntries(
						Object.entries(rawMap).filter(([, v]) => v !== null),
					) as Record<string, string>;

					setSuggested(filteredMap);
					setMapping(filteredMap);
					setHeaders(data.detectedColumns ?? Object.values(filteredMap));
					setStep(2);
					refreshList();
					return;
				}
				if (status.status === "ERROR") {
					throw new Error(status.errorMessage ?? "Falha no processamento");
				}
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao analisar arquivo",
				);
				refreshList();
				return;
			}
			await new Promise((r) => setTimeout(r, 1500));
		}
		toast.warning(
			"A análise está demorando. Verifique a lista de uploads abaixo.",
		);
		refreshList();
	}

	async function handleConfirmMapping() {
		if (!uploadId) return;
		if (!branchId) {
			toast.error("Selecione a filial de destino");
			return;
		}
		const missing = REQUIRED_FIELDS.filter((f) => !mapping[f]);
		if (missing.length > 0) {
			toast.error(
				`Mapeie os campos obrigatórios: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`,
			);
			return;
		}
		setConfirming(true);
		try {
			const cleanMapping = Object.fromEntries(
				Object.entries(mapping).filter(([, v]) => v),
			);
			await uploadsService.confirmMapping(uploadId, cleanMapping, branchId);
			setStep(3);
			pollForFinish(uploadId);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Falha ao confirmar mapeamento",
			);
		} finally {
			setConfirming(false);
		}
	}

	async function pollForFinish(id: string) {
		setProcessingStatus("PROCESSING");
		setProcessingError(null);
		for (let i = 0; i < 90; i++) {
			try {
				const status = await uploadsService.getById(id);
				setProcessingStatus(status.status);
				if (status.status === "DONE") {
					setShowConfetti(true);
					toast.success("Processamento concluído com sucesso");
					refreshList();
					return;
				}
				if (status.status === "ERROR") {
					setProcessingError(status.errorMessage ?? "Falha no processamento");
					refreshList();
					return;
				}
			} catch (err) {
				setProcessingError(
					err instanceof Error ? err.message : "Falha ao verificar status",
				);
				return;
			}
			await new Promise((r) => setTimeout(r, 2000));
		}
		toast.warning("O processamento está demorando. Acompanhe na lista.");
		refreshList();
	}

	const columns: Column<Upload>[] = [
		{
			key: "originalName",
			header: "Arquivo",
			render: (row) => (
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<DescriptionIcon
						fontSize="small"
						style={{ color: "var(--color-text-muted)" }}
					/>
					<span style={{ fontWeight: 500 }}>{row.originalName}</span>
				</div>
			),
			sortable: true,
			sortValue: (r) => r.originalName,
		},
		{
			key: "createdAt",
			header: "Data",
			render: (row) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: 12,
						color: "var(--color-text-secondary)",
					}}>
					{formatDateTime(row.createdAt)}
				</span>
			),
			sortable: true,
			sortValue: (r) => r.createdAt,
		},
		{
			key: "status",
			header: "Status",
			render: (row) => statusBadge(row.status),
		},
		{
			key: "error",
			header: "Detalhes",
			render: (row) =>
				row.errorMessage ? (
					<span style={{ color: "var(--color-error)", fontSize: 12 }}>
						{row.errorMessage}
					</span>
				) : (
					<span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
						—
					</span>
				),
		},
		{
			key: "actions",
			header: "",
			align: "right" as const,
			render: (row) => (
				<button
					type="button"
					className={styles.deleteBtn}
					disabled={deletingId === row.id}
					onClick={() => handleDelete(row.id)}
					aria-label="Excluir upload">
					<DeleteOutlineIcon fontSize="small" />
				</button>
			),
		},
	];

	return (
		<div>
			<PageHeader
				eyebrow="Importação"
				title="Uploads"
				description="Envie suas planilhas de vendas. O Prisma identifica colunas automaticamente."
			/>

			<div className={styles.wizard}>
				<div
					className={styles.steps}
					role="progressbar"
					aria-valuenow={step}
					aria-valuemin={1}
					aria-valuemax={3}>
					{[1, 2, 3].map((n, idx) => (
						<span
							key={n}
							style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span
								className={[
									styles.step,
									step === n ? styles.stepActive : "",
									step > n ? styles.stepDone : "",
								]
									.filter(Boolean)
									.join(" ")}>
								<span className={styles.stepNumber}>{n}</span>
								{n === 1 ? "Arquivo" : n === 2 ? "Mapeamento" : "Processamento"}
							</span>
							{idx < 2 ? (
								<span
									className={[
										styles.stepConnector,
										step > n ? styles.stepConnectorDone : "",
									]
										.filter(Boolean)
										.join(" ")}
								/>
							) : null}
						</span>
					))}
				</div>

				{step === 1 ? (
					<Card>
						{file ? (
							<div className={styles.filePreview}>
								<div className={styles.fileIcon}>
									<DescriptionIcon fontSize="small" />
								</div>
								<div className={styles.fileInfo}>
									<div className={styles.fileName}>{file.name}</div>
									<div className={styles.fileSize}>
										{formatBytes(file.size)}
									</div>
								</div>
								<button
									type="button"
									className={styles.removeBtn}
									onClick={() => setFile(null)}
									aria-label="Remover arquivo">
									<CloseIcon fontSize="small" />
								</button>
							</div>
						) : (
							<label
								className={[
									styles.dropzone,
									dragActive ? styles.dropzoneActive : "",
								]
									.filter(Boolean)
									.join(" ")}
								onDragEnter={(e: DragEvent) => {
									e.preventDefault();
									setDragActive(true);
								}}
								onDragOver={(e: DragEvent) => {
									e.preventDefault();
									setDragActive(true);
								}}
								onDragLeave={() => setDragActive(false)}
								onDrop={(e: DragEvent) => {
									e.preventDefault();
									setDragActive(false);
									handleSelectFile(e.dataTransfer.files[0] ?? null);
								}}>
								<input
									ref={fileInputRef}
									type="file"
									accept={ACCEPTED.join(",")}
									style={{ display: "none" }}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										handleSelectFile(e.target.files?.[0] ?? null)
									}
								/>
								<div className={styles.dropIcon}>
									<CloudUploadIcon style={{ fontSize: 32 }} />
								</div>
								<div className={styles.dropTitle}>
									Arraste um arquivo CSV ou XLSX aqui
								</div>
								<div className={styles.dropHint}>
									ou clique para selecionar do seu computador
								</div>
								<div className={styles.dropTypes}>
									.csv · .xlsx · .xls — máx {MAX_SIZE_MB} MB
								</div>
							</label>
						)}

						<div
							className={styles.actions}
							style={{ marginTop: 24, justifyContent: "flex-end" }}>
							<Button
								onClick={handleUploadFile}
								disabled={!file}
								loading={uploading}>
								Próximo →
							</Button>
						</div>
					</Card>
				) : null}

				{step === 2 ? (
					<Card
						title="Mapear colunas"
						subtitle="Confirme a correspondência entre os campos do Prisma e as colunas do seu arquivo.">
						<div className={styles.mappingTable}>
							{ALL_FIELDS.map((field) => {
								const isRequired = REQUIRED_FIELDS.includes(field);
								const suggestedCol = suggested[field];
								const score = suggestedCol
									? mapping[field] === suggestedCol
										? 0.9
										: 0.5
									: 0;
								return (
									<div
										key={field}
										className={styles.mappingRow}>
										<span className={styles.mappingLabel}>
											{FIELD_LABELS[field]}
											{isRequired ? (
												<span className={styles.required}>*</span>
											) : null}
										</span>
										<Select
											value={mapping[field] ?? ""}
											onChange={(e) =>
												setMapping((prev) => ({
													...prev,
													[field]: e.target.value,
												}))
											}
											placeholder="— selecione —"
											options={[
												{ value: "", label: "— não mapear —" },
												...headers.map((h) => ({ value: h, label: h })),
											]}
										/>
										{suggestedCol && mapping[field] === suggestedCol ? (
											<span
												className={[
													styles.confidence,
													confidenceClass(score),
												].join(" ")}>
												{Math.round(score * 100)}%
											</span>
										) : (
											<span style={{ width: 36 }} />
										)}
									</div>
								);
							})}
						</div>

						<div style={{ marginTop: 24 }}>
							<Select
								label="Filial de destino"
								required
								placeholder="— selecione a filial —"
								value={branchId}
								onChange={(e) => setBranchId(e.target.value)}
								options={branches.map((b) => ({
									value: b.id,
									label: `${b.name} (${b.city}/${b.state})`,
								}))}
							/>
						</div>

						<div
							className={styles.actions}
							style={{ marginTop: 16 }}>
							<Button
								variant="ghost"
								onClick={resetWizard}>
								Cancelar
							</Button>
							<Button
								onClick={handleConfirmMapping}
								loading={confirming}>
								Confirmar mapeamento
							</Button>
						</div>
					</Card>
				) : null}

				{step === 3 ? (
					<Card className={styles.successWrap}>
						{processingStatus === "DONE" ? (
							<>
								{showConfetti ? (
									<div className={styles.confetti}>
										{Array.from({ length: 20 }).map((_, i) => (
											<span
												key={i}
												className={styles.confettiPiece}
												style={{
													left: `${(i / 20) * 100}%`,
													background:
														i % 2 === 0
															? "var(--color-primary)"
															: "var(--color-success)",
													animationDelay: `${(i % 5) * 0.15}s`,
												}}
											/>
										))}
									</div>
								) : null}
								<div className={styles.processing}>
									<div
										className={styles.pulseDot}
										style={{ background: "var(--color-primary)" }}>
										<CheckCircleIcon style={{ fontSize: 32 }} />
									</div>
									<h3
										style={{
											fontFamily: "var(--font-display)",
											fontSize: 22,
											fontWeight: 700,
										}}>
										Processamento concluído
									</h3>
									<p
										style={{
											color: "var(--color-text-secondary)",
											maxWidth: "40ch",
										}}>
										Seus dados estão disponíveis no dashboard. Métricas diárias
										e anomalias foram recalculadas automaticamente.
									</p>
									<div style={{ display: "flex", gap: 8 }}>
										<Button
											variant="secondary"
											onClick={resetWizard}>
											Enviar outro arquivo
										</Button>
										<Button
											onClick={() => (window.location.href = "/dashboard")}>
											Ver dashboard →
										</Button>
									</div>
								</div>
							</>
						) : processingStatus === "ERROR" ? (
							<div className={styles.processing}>
								<div
									className={styles.pulseDot}
									style={{ background: "var(--color-error)" }}>
									<ErrorOutlineIcon style={{ fontSize: 32 }} />
								</div>
								<h3
									style={{
										fontFamily: "var(--font-display)",
										fontSize: 22,
										fontWeight: 700,
									}}>
									Falha no processamento
								</h3>
								<p style={{ color: "var(--color-error)", maxWidth: "40ch" }}>
									{processingError}
								</p>
								<Button
									variant="secondary"
									onClick={resetWizard}>
									Tentar novamente
								</Button>
							</div>
						) : (
							<div className={styles.processing}>
								<div className={styles.pulseDot}>
									<HourglassEmptyIcon style={{ fontSize: 32 }} />
								</div>
								<h3
									style={{
										fontFamily: "var(--font-display)",
										fontSize: 22,
										fontWeight: 700,
									}}>
									Processando seu arquivo...
								</h3>
								<p style={{ color: "var(--color-text-secondary)" }}>
									Validando linhas, inserindo vendas e recalculando métricas.
									Isso pode levar alguns segundos.
								</p>
								<Spinner size="md" />
							</div>
						)}
					</Card>
				) : null}
			</div>

			<Card
				title="Uploads anteriores"
				subtitle="Histórico do tenant">
				<Table
					columns={columns}
					rows={uploads}
					rowKey={(r) => r.id}
					loading={listLoading}
					emptyTitle="Nenhum upload registrado"
					emptyDescription="Envie seu primeiro arquivo CSV ou XLSX acima."
				/>
			</Card>
		</div>
	);
}
