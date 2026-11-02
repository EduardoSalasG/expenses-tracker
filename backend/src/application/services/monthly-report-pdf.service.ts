import PDFDocument from 'pdfkit';

export interface MonthlyReportPdfInput {
  accountName: string;
  periodLabel: string;
  expenses: Array<{ currency: string; total: number }>;
  incomes: Array<{ currency: string; total: number }>;
  categories: Array<{ name: string; currency: string; total: number; previousTotal?: number }>;
  topExpenses?: Array<{ concept: string; currency: string; total: number; date?: string }>;
}

export function buildMonthlyReportKpis(input: Pick<MonthlyReportPdfInput, 'expenses' | 'incomes' | 'categories'>) {
  const incomeByCurrency = totalsByCurrency(input.incomes);
  const expenseByCurrency = totalsByCurrency(input.expenses);
  const balances = [...new Set([...Object.keys(incomeByCurrency), ...Object.keys(expenseByCurrency)])]
    .sort((left, right) => left.localeCompare(right))
    .map((currency) => ({
      currency,
      income: incomeByCurrency[currency] ?? 0,
      expense: expenseByCurrency[currency] ?? 0,
      balance: (incomeByCurrency[currency] ?? 0) - (expenseByCurrency[currency] ?? 0)
    }));
  const insights = balances.map((item) => item.balance >= 0
    ? `${item.currency}: cerraste el período con saldo positivo de ${formatMoney(item.balance, item.currency)}.`
    : `${item.currency}: tus gastos superaron los ingresos por ${formatMoney(Math.abs(item.balance), item.currency)}.`);
  insights.push(...input.categories
    .filter((item) => item.previousTotal !== undefined && item.total !== item.previousTotal)
    .sort((left, right) => Math.abs((right.total - (right.previousTotal ?? 0))) - Math.abs((left.total - (left.previousTotal ?? 0))))
    .slice(0, 3)
    .map((item) => {
      const delta = item.total - (item.previousTotal ?? 0);
      return `${item.name} ${delta > 0 ? 'aumentó' : 'disminuyó'} ${formatMoney(Math.abs(delta), item.currency)} frente al período anterior.`;
    }));
  return { balances, insights };
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

    const kpis = buildMonthlyReportKpis(input);
    document.fillColor('#0f172a').fontSize(14).text('Indicadores clave');
    document.moveDown(0.5);
    for (const item of kpis.balances) {
      const label = `${item.currency} · ingresos ${formatMoney(item.income, item.currency)} · gastos ${formatMoney(item.expense, item.currency)}`;
      const value = formatMoney(item.balance, item.currency);
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
      const variation = category.previousTotal === undefined ? '' : ` · anterior ${formatMoney(category.previousTotal, category.currency)}`;
      document.fillColor('#0f172a').text(`${formatMoney(category.total, category.currency)}${variation}`, 56, y + 12, { align: 'right' });
      document.moveDown(1.8);
    }

    if (input.topExpenses?.length) {
      document.moveDown(0.75).fillColor('#0f172a').fontSize(14).text('Gastos principales');
      for (const expense of input.topExpenses.slice(0, 5)) {
        document.moveDown(0.25).fontSize(10).fillColor('#334155').text(`${expense.concept}${expense.date ? ` · ${expense.date.slice(0, 10)}` : ''}`, 56, document.y, { continued: true });
        document.fillColor('#0f172a').text(formatMoney(expense.total, expense.currency), { align: 'right' });
      }
    }

    document.moveDown(0.75).fillColor('#0f172a').fontSize(14).text('Insights');
    document.moveDown(0.35).fontSize(11).fillColor('#334155').list(
      kpis.insights.length ? kpis.insights : ['No hubo movimientos para elaborar insights del período.'],
      { bulletRadius: 2, textIndent: 12 }
    );
    document.end();
    return completed;
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function totalsByCurrency(items: Array<{ currency: string; total: number }>) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.total;
    return totals;
  }, {});
}
