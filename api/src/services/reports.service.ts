import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';

import * as DashboardService from './dashboard.service';
import * as AnomaliesService from './anomalies.service';

interface ReportFilters {
  tenantId:  string;
  branchId?: string;
  from?:     Date;
  to?:       Date;
}

type AnomalyItem = Awaited<ReturnType<typeof AnomaliesService.listAnomalies>>[number];

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

export async function generatePdf(filters: ReportFilters, res: Response) {
  const { kpis, topProducts, branchesRanking, projection, anomalies } = await collectReportData(filters);

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="prisma-report.pdf"');
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text('PRISMA — Relatório Gerencial', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('KPIs Gerais');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Faturamento Total:    R$ ${kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`Lucro Líquido:        R$ ${kpis.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`ROI:                  ${kpis.roi}%`);
  doc.text(`Margem de Lucro:      ${kpis.profitMargin}%`);
  doc.text(`Anomalias detectadas: ${kpis.anomaliesCount}`);
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Projeção do Mês Corrente');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Faturamento até hoje: R$ ${projection.currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  doc.text(`Projeção estimada: R$ ${projection.projectedMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} – R$ ${projection.projectedMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  if (projection.goalAchievement !== null) {
    doc.text(`Atingimento de meta: ${projection.goalAchievement}%`);
  }
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Produtos Âncora (Pareto 80/20)');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  topProducts.products.filter((p) => p.isAnchor).slice(0, 20).forEach((p, i) => {
    doc.text(`${i + 1}. ${p.productName} — Lucro: R$ ${p.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Qtd: ${p.quantity}`);
  });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Ranking de Filiais');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  branchesRanking.forEach((b, i) => {
    const goal = b.goalAchievement !== null ? ` | Meta: ${b.goalAchievement}%` : '';
    doc.text(`${i + 1}. ${b.name} (${b.city}/${b.state}) — Faturamento: R$ ${b.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Margem: ${b.margin}%${goal}`);
  });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Alertas de Anomalias');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  if (anomalies.length === 0) {
    doc.text('Nenhuma anomalia detectada no período.');
  } else {
    anomalies.slice(0, 20).forEach((a: AnomalyItem) => {
      const date = new Date(a.saleDate).toLocaleDateString('pt-BR');
      const dev  = Number(a.deviation).toFixed(2);
      doc.text(`• [${date}] ${a.branch?.name ?? a.branchId}: ${a.hypothesis ?? 'Anomalia detectada'} (desvio: ${dev}%)`);
    });
  }

  doc.end();
}

export async function generateExcel(filters: ReportFilters, res: Response) {
  const { kpis, topProducts, branchesRanking, projection, anomalies } = await collectReportData(filters);

  const workbook    = new ExcelJS.Workbook();
  workbook.creator  = 'Prisma BI';
  workbook.created  = new Date();

  const kpiSheet    = workbook.addWorksheet('KPIs');
  kpiSheet.columns  = [
    { header: 'Indicador', key: 'label', width: 30 },
    { header: 'Valor',     key: 'value', width: 20 },
  ];
  kpiSheet.addRows([
    { label: 'Faturamento Total',       value: kpis.totalRevenue },
    { label: 'Lucro Líquido',           value: kpis.netProfit },
    { label: 'ROI (%)',                 value: kpis.roi },
    { label: 'Margem de Lucro (%)',     value: kpis.profitMargin },
    { label: 'Total de Vendas',         value: kpis.totalSales },
    { label: 'Anomalias Detectadas',    value: kpis.anomaliesCount },
    { label: 'Projeção Mínima',         value: projection.projectedMin },
    { label: 'Projeção Máxima',         value: projection.projectedMax },
    { label: 'Atingimento de Meta (%)', value: projection.goalAchievement ?? 'N/A' },
  ]);

  const paretoSheet    = workbook.addWorksheet('Pareto 80-20');
  paretoSheet.columns  = [
    { header: 'Produto',        key: 'productName', width: 40 },
    { header: 'Faturamento',    key: 'revenue',     width: 18 },
    { header: 'Lucro Líquido',  key: 'netProfit',   width: 18 },
    { header: 'Quantidade',     key: 'quantity',    width: 14 },
    { header: 'Produto Âncora', key: 'isAnchor',    width: 16 },
  ];
  topProducts.products.forEach((p) =>
    paretoSheet.addRow({ ...p, isAnchor: p.isAnchor ? 'Sim' : 'Não' }),
  );

  const branchSheet   = workbook.addWorksheet('Ranking de Filiais');
  branchSheet.columns = [
    { header: 'Filial',          key: 'name',            width: 30 },
    { header: 'Cidade',          key: 'city',            width: 20 },
    { header: 'Estado',          key: 'state',           width: 10 },
    { header: 'Faturamento',     key: 'revenue',         width: 18 },
    { header: 'Lucro Líquido',   key: 'netProfit',       width: 18 },
    { header: 'Margem (%)',      key: 'margin',          width: 14 },
    { header: 'Meta Mensal',     key: 'monthlyGoal',     width: 16 },
    { header: 'Atingimento (%)', key: 'goalAchievement', width: 16 },
  ];
  branchesRanking.forEach((b) => branchSheet.addRow(b));

  const anomSheet    = workbook.addWorksheet('Anomalias');
  anomSheet.columns  = [
    { header: 'Data',       key: 'saleDate',   width: 14 },
    { header: 'Filial',     key: 'branchName', width: 30 },
    { header: 'Desvio (%)', key: 'deviation',  width: 14 },
    { header: 'Hipótese',   key: 'hypothesis', width: 60 },
  ];
  anomalies.forEach((a: AnomalyItem) =>
    anomSheet.addRow({
      saleDate:   new Date(a.saleDate).toLocaleDateString('pt-BR'),
      branchName: a.branch?.name ?? a.branchId,
      deviation:  Number(a.deviation).toFixed(2),
      hypothesis: a.hypothesis ?? '',
    }),
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="prisma-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}
