import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import * as DashboardService from './dashboard.service';
import * as AnomaliesService from './anomalies.service';

interface ReportFilters {
  tenantId: string;
  branchId?: string;
  from?: Date;
  to?: Date;
}

// ─── Coleta os dados necessários para ambos os relatórios ─────────────────────
async function collectReportData(filters: ReportFilters) {
  const [kpis, topProducts, branchesRanking, projection, anomalies] = await Promise.all([
    DashboardService.getKpis(filters),
    DashboardService.getTopProducts(filters),
    DashboardService.getBranchesRanking(filters),
    DashboardService.getProjection(filters),
    AnomaliesService.listAnomalies(filters.tenantId, filters),
  ]);
  return { kpis, topProducts, branchesRanking, projection, anomalies };
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function generatePdf(filters: ReportFilters, res: Response) {
  const { kpis, topProducts, branchesRanking, projection, anomalies } = await collectReportData(filters);

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="prisma-report.pdf"');
  doc.pipe(res);

  // ── Cabeçalho ──
  doc.fontSize(20).font('Helvetica-Bold').text('PRISMA — Relatório Gerencial', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1.5);

  // ── KPIs ──
  doc.fontSize(14).font('Helvetica-Bold').text('KPIs Gerais');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Faturamento Total:   R$ ${kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`Lucro Líquido:       R$ ${kpis.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`ROI:                 ${kpis.roi}%`);
  doc.text(`Margem de Lucro:     ${kpis.profitMargin}%`);
  doc.text(`Anomalias detectadas: ${kpis.anomaliesCount}`);
  doc.moveDown(1.5);

  // ── Projeção ──
  doc.fontSize(14).font('Helvetica-Bold').text('Projeção do Mês Corrente');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Faturamento até hoje: R$ ${projection.currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`Projeção estimada:    R$ ${projection.projectedMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} – R$ ${projection.projectedMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  if (projection.goalAchievement !== null) {
    doc.text(`Atingimento de meta: ${projection.goalAchievement}%`);
  }
  doc.moveDown(1.5);

  // ── Pareto 80/20 — Produtos Âncora ──
  doc.fontSize(14).font('Helvetica-Bold').text('Produtos Âncora (Pareto 80/20)');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  const anchorProducts = topProducts.products.filter((p) => p.isAnchor).slice(0, 20);
  anchorProducts.forEach((p, i) => {
    doc.text(`${i + 1}. ${p.productName} — Lucro: R$ ${p.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Qtd: ${p.quantity}`);
  });
  doc.moveDown(1.5);

  // ── Ranking de Filiais ──
  doc.fontSize(14).font('Helvetica-Bold').text('Ranking de Filiais');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  branchesRanking.forEach((b, i) => {
    doc.text(`${i + 1}. ${b.name} (${b.city}/${b.state}) — Faturamento: R$ ${b.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Margem: ${b.margin}%${b.goalAchievement !== null ? ` | Meta: ${b.goalAchievement}%` : ''}`);
  });
  doc.moveDown(1.5);

  // ── Anomalias ──
  doc.fontSize(14).font('Helvetica-Bold').text('Alertas de Anomalias');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  if (anomalies.length === 0) {
    doc.text('Nenhuma anomalia detectada no período.');
  } else {
    anomalies.slice(0, 20).forEach((a: any) => {
      const date = new Date(a.saleDate).toLocaleDateString('pt-BR');
      doc.text(`• [${date}] ${a.branch?.name ?? a.branchId}: ${a.hypothesis ?? 'Anomalia detectada'} (desvio: ${a.deviation}%)`);
    });
  }

  doc.end();
}

// ─── Excel ────────────────────────────────────────────────────────────────────
export async function generateExcel(filters: ReportFilters, res: Response) {
  const { kpis, topProducts, branchesRanking, projection, anomalies } = await collectReportData(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Prisma BI';
  workbook.created = new Date();

  // ── Aba: KPIs ──
  const kpiSheet = workbook.addWorksheet('KPIs');
  kpiSheet.columns = [
    { header: 'Indicador', key: 'label', width: 30 },
    { header: 'Valor',     key: 'value', width: 20 },
  ];
  kpiSheet.addRows([
    { label: 'Faturamento Total',    value: kpis.totalRevenue },
    { label: 'Lucro Líquido',        value: kpis.netProfit },
    { label: 'ROI (%)',              value: kpis.roi },
    { label: 'Margem de Lucro (%)',  value: kpis.profitMargin },
    { label: 'Total de Vendas',      value: kpis.totalSales },
    { label: 'Anomalias Detectadas', value: kpis.anomaliesCount },
    { label: 'Projeção Mínima',      value: projection.projectedMin },
    { label: 'Projeção Máxima',      value: projection.projectedMax },
    { label: 'Atingimento de Meta (%)', value: projection.goalAchievement ?? 'N/A' },
  ]);

  // ── Aba: Pareto ──
  const paretoSheet = workbook.addWorksheet('Pareto 80-20');
  paretoSheet.columns = [
    { header: 'Produto',        key: 'productName', width: 40 },
    { header: 'Faturamento',    key: 'revenue',     width: 18 },
    { header: 'Lucro Líquido',  key: 'netProfit',   width: 18 },
    { header: 'Quantidade',     key: 'quantity',    width: 14 },
    { header: 'Produto Âncora', key: 'isAnchor',    width: 16 },
  ];
  topProducts.products.forEach((p) =>
    paretoSheet.addRow({ ...p, isAnchor: p.isAnchor ? 'Sim' : 'Não' })
  );

  // ── Aba: Filiais ──
  const branchSheet = workbook.addWorksheet('Ranking de Filiais');
  branchSheet.columns = [
    { header: 'Filial',             key: 'name',            width: 30 },
    { header: 'Cidade',             key: 'city',            width: 20 },
    { header: 'Estado',             key: 'state',           width: 10 },
    { header: 'Faturamento',        key: 'revenue',         width: 18 },
    { header: 'Lucro Líquido',      key: 'netProfit',       width: 18 },
    { header: 'Margem (%)',         key: 'margin',          width: 14 },
    { header: 'Meta Mensal',        key: 'monthlyGoal',     width: 16 },
    { header: 'Atingimento (%)',    key: 'goalAchievement', width: 16 },
  ];
  branchesRanking.forEach((b) => branchSheet.addRow(b));

  // ── Aba: Anomalias ──
  const anomSheet = workbook.addWorksheet('Anomalias');
  anomSheet.columns = [
    { header: 'Data',     key: 'saleDate',   width: 14 },
    { header: 'Filial',   key: 'branchName', width: 30 },
    { header: 'Desvio (%)', key: 'deviation', width: 14 },
    { header: 'Hipótese', key: 'hypothesis', width: 60 },
  ];
  (anomalies as any[]).forEach((a) =>
    anomSheet.addRow({
      saleDate:   new Date(a.saleDate).toLocaleDateString('pt-BR'),
      branchName: a.branch?.name ?? a.branchId,
      deviation:  a.deviation,
      hypothesis: a.hypothesis ?? '',
    })
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="prisma-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}
