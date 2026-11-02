import PDFDocument from 'pdfkit';

export interface MonthlyReportPdfInput {
  accountName: string;
  periodLabel: string;
  expenses: Array<{ currency: string; total: number }>;
  incomes: Array<{ currency: string; total: number }>;
  categories: Array<{ name: string; currency: string; total: number }>;
}

export class MonthlyReportPdfService {
  async render(input: MonthlyReportPdfInput): Promise<Buffer> {
    const document = new PDFDocument({ margin: 48, size: 'A4', info: { Title: `Informe mensual - ${input.accountName}` } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.once('end', () => resolve(Buffer.concat(chunks)));
      document.once('error', reject);
    });

    document.fontSize(22).fillColor('#0f172a').text('Informe mensual', { align: 'left' });
    document.moveDown(0.25).fontSize(12).fillColor('#475569').text(`${input.accountName} · ${input.periodLabel}`);
    document.moveDown(1.5);

    document.fillColor('#0f172a').fontSize(14).text('Resumen');
    document.moveDown(0.5);
    const rows = [
      ...input.incomes.map((item) => ['Ingresos', formatMoney(item.total, item.currency)]),
      ...input.expenses.map((item) => ['Gastos', formatMoney(item.total, item.currency)])
    ];
    for (const [label, value] of rows) {
      document.fontSize(11).fillColor('#475569').text(label, 56, document.y, { continued: true });
      document.fillColor('#0f172a').text(value, { align: 'right' });
      document.moveDown(0.3);
    }

    document.moveDown(1).fillColor('#0f172a').fontSize(14).text('Gastos por categoría');
    const maximum = Math.max(1, ...input.categories.map((item) => item.total));
    for (const category of input.categories.slice(0, 8)) {
      const y = document.y + 8;
      const width = Math.max(4, (category.total / maximum) * 280);
      document.fontSize(10).fillColor('#334155').text(category.name, 56, y - 8);
      document.roundedRect(240, y, width, 10, 4).fill('#2563eb');
      document.fillColor('#0f172a').text(formatMoney(category.total, category.currency), 56, y + 12, { align: 'right' });
      document.moveDown(1.8);
    }

    const expenseTotal = input.expenses.reduce((sum, item) => sum + item.total, 0);
    const incomeTotal = input.incomes.reduce((sum, item) => sum + item.total, 0);
    const insight = incomeTotal > 0
      ? expenseTotal <= incomeTotal ? 'Tus gastos se mantuvieron dentro de tus ingresos registrados.' : 'Tus gastos superaron tus ingresos registrados.'
      : 'Registra ingresos para evaluar el balance mensual.';
    document.moveDown(0.75).fillColor('#0f172a').fontSize(14).text('Insight');
    document.moveDown(0.35).fontSize(11).fillColor('#334155').text(insight);
    document.end();
    return completed;
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
