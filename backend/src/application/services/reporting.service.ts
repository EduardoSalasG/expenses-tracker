import type { Category, Expense, LanguageCode, MonthlyBudget, ReportFrequency } from '../../domain/index.js';

export function totalsByCurrency(items: Array<{ amount: number; currency: string }>) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.amount;
    return totals;
  }, {});
}

export function reportPeriod(frequency: ReportFrequency, now: Date) {
  if (frequency === 'daily') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: from.toISOString().slice(0, 10) };
  }

  if (frequency === 'weekly') {
    const day = now.getUTCDay() || 7;
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1, 0, 0, 0));
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 6, 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}` };
  }

  if (frequency === 'monthly') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: from.toISOString().slice(0, 7) };
  }

  const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString(), label: String(now.getUTCFullYear()) };
}

export function monthPeriod(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function filterReportByCategory<T extends {
  expenses: Expense[];
  expenseTotalsByCurrency: Record<string, number>;
}>(
  report: T,
  categories: Category[],
  categoryName?: string
): T {
  if (!categoryName) return report;
  const category = categories.find((item) => normalizeName(item.name) === normalizeName(categoryName));
  if (!category) return report;
  const rootId = category.parentId ?? category.id;
  const subcategoryId = category.parentId ? category.id : undefined;
  const expenses = report.expenses.filter((expense) =>
    expense.categoryId === rootId && (!subcategoryId || expense.subcategoryId === subcategoryId)
  );
  return {
    ...report,
    expenses,
    expenseTotalsByCurrency: totalsByCurrency(expenses)
  };
}

export function formatReportMessage(
  frequency: ReportFrequency,
  label: string,
  report: {
    expenses: Expense[];
    incomes: Array<{ amount: number; currency: string }>;
    expenseTotalsByCurrency: Record<string, number>;
    incomeTotalsByCurrency: Record<string, number>;
    expenseVariationByCategory?: Array<{
      categoryName: string;
      currency: string;
      currentTotal: number;
      previousTotal: number;
      delta: number;
      deltaPercent: number | null;
    }>;
  },
  language: LanguageCode = 'es'
) {
  const variationLines = formatVariationLines(frequency, report.expenseVariationByCategory ?? [], language);
  const expenseTotals = formatTotals(report.expenseTotalsByCurrency, language);
  const incomeTotals = formatTotals(report.incomeTotalsByCurrency, language);
  if (language === 'en') {
    return [
      `${reportFrequencyLabel(frequency, language)} report (${label})`,
      `Income: ${incomeTotals}`,
      `Expenses: ${expenseTotals}`,
      `Income movements: ${report.incomes.length}`,
      `Expense movements: ${report.expenses.length}`,
      ...variationLines
    ].join('\n');
  }

  return [
    `Reporte ${reportFrequencyLabel(frequency)} (${label})`,
    `Ingresos: ${incomeTotals}`,
    `Gastos: ${expenseTotals}`,
    `Movimientos de ingreso: ${report.incomes.length}`,
    `Movimientos de gasto: ${report.expenses.length}`,
    ...variationLines
  ].join('\n');
}

export function formatBudgetStatusMessage(
  month: string,
  budgets: MonthlyBudget[],
  expenses: Expense[],
  categories: Category[],
  categoryName?: string,
  language: LanguageCode = 'es'
) {
  const filteredBudgets = categoryName
    ? budgets.filter((budget) => {
      const category = categories.find((item) => item.id === (budget.subcategoryId ?? budget.categoryId));
      return category && normalizeName(category.name) === normalizeName(categoryName);
    })
    : budgets;

  if (!filteredBudgets.length) {
    if (language === 'en') return `No budgets configured for ${categoryName ? `${categoryName} in ` : ''}${month}.`;
    return `No hay presupuestos configurados para ${categoryName ? `${categoryName} en ` : ''}${month}.`;
  }

  const lines = filteredBudgets.map((budget) => {
    const spent = expenses
      .filter((expense) =>
        expense.currency === budget.currency &&
        expense.categoryId === budget.categoryId &&
        (!budget.subcategoryId || expense.subcategoryId === budget.subcategoryId)
      )
      .reduce((total, expense) => total + expense.amount, 0);
    const remaining = Math.max(budget.amount - spent, 0);
    const label = categoryLabel(categories, budget.subcategoryId ?? budget.categoryId);
    if (language === 'en') {
      return `${label}: spent ${formatMoney(budget.currency, spent, language)} of ${formatMoney(budget.currency, budget.amount, language)}. Remaining: ${formatMoney(budget.currency, remaining, language)}.`;
    }
    return `${label}: gastado ${formatMoney(budget.currency, spent, language)} de ${formatMoney(budget.currency, budget.amount, language)}. Disponible: ${formatMoney(budget.currency, remaining, language)}.`;
  });

  return [language === 'en' ? `Budget ${month}` : `Presupuesto ${month}`, ...lines].join('\n');
}

export function formatMoney(currency: string, amount: number, language: LanguageCode = 'es') {
  const normalizedCurrency = currency.trim().toUpperCase();
  const locale = language === 'es' ? 'es-CL' : 'en-US';
  if (normalizedCurrency === 'CLP') {
    return `$${Math.round(amount).toLocaleString(locale)}`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: normalizedCurrency === 'USD' ? 2 : 0
  }).format(amount);
}

function formatTotals(totals: Record<string, number>, language: LanguageCode) {
  const entries = Object.entries(totals);
  if (!entries.length) return language === 'en' ? 'No movement' : 'Sin movimientos';
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatMoney(currency, amount, language))
    .join(' | ');
}

function reportFrequencyLabel(frequency: ReportFrequency, language: LanguageCode = 'es') {
  if (language === 'en') return frequency;
  const labels: Record<ReportFrequency, string> = {
    daily: 'diario',
    weekly: 'semanal',
    monthly: 'mensual',
    yearly: 'anual'
  };
  return labels[frequency];
}

function formatVariationLines(
  frequency: ReportFrequency,
  rows: Array<{
    categoryName: string;
    currency: string;
    currentTotal: number;
    previousTotal: number;
    delta: number;
    deltaPercent: number | null;
  }>,
  language: LanguageCode
) {
  if (frequency !== 'monthly' && frequency !== 'yearly') return [];
  const nonZeroRows = rows.filter((row) => Math.abs(row.delta) > 0);
  if (!nonZeroRows.length) {
    return [language === 'en' ? 'Category variation vs previous period: no changes.' : 'Variación por categoría vs período anterior: sin cambios.'];
  }

  const lines = nonZeroRows
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 5)
    .map((row) => {
      const trend = row.delta > 0 ? (language === 'en' ? 'up' : 'sube') : (language === 'en' ? 'down' : 'baja');
      const deltaLabel = formatMoney(row.currency, Math.abs(row.delta), language);
      const percentLabel = row.deltaPercent === null ? 'n/a' : `${Math.abs(row.deltaPercent).toFixed(2)}%`;
      return language === 'en'
        ? `- ${row.categoryName}: ${trend} ${deltaLabel} (${percentLabel}).`
        : `- ${row.categoryName}: ${trend} ${deltaLabel} (${percentLabel}).`;
    });

  return [language === 'en' ? 'Category variation vs previous period:' : 'Variación por categoría vs período anterior:', ...lines];
}

function categoryLabel(categories: Category[], categoryId: string): string {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return 'Uncategorized';
  if (!category.parentId) return category.name;
  return `${categoryLabel(categories, category.parentId)} / ${category.name}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
