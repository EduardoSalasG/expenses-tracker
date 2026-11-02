import { describe, expect, it } from 'vitest';
import { buildMonthlyReportKpis, MonthlyReportPdfService } from './monthly-report-pdf.service.js';

describe('MonthlyReportPdfService', () => {
  it('renders a valid PDF with the account name, KPI totals and an insight', async () => {
    const pdf = await new MonthlyReportPdfService().render({
      accountName: 'Casa',
      periodLabel: 'octubre de 2026',
      expenses: [{ currency: 'CLP', total: 5000 }],
      incomes: [{ currency: 'CLP', total: 10000 }],
      categories: [{ name: 'Frutas y verduras', currency: 'CLP', total: 5000 }]
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('keeps balances separate by currency and produces explainable insights', () => {
    expect(buildMonthlyReportKpis({
      expenses: [{ currency: 'CLP', total: 5000 }, { currency: 'USD', total: 20 }],
      incomes: [{ currency: 'CLP', total: 12000 }, { currency: 'USD', total: 10 }],
      categories: [
        { name: 'Alimentos', currency: 'CLP', total: 5000, previousTotal: 3000 },
        { name: 'Suscripciones', currency: 'USD', total: 20, previousTotal: 10 }
      ]
    })).toEqual({
      balances: [
        { currency: 'CLP', income: 12000, expense: 5000, balance: 7000 },
        { currency: 'USD', income: 10, expense: 20, balance: -10 }
      ],
      insights: [
        'CLP: cerraste el período con saldo positivo de $7.000.',
        'USD: tus gastos superaron los ingresos por US$10.',
        'Alimentos aumentó $2.000 frente al período anterior.',
        'Suscripciones aumentó US$10 frente al período anterior.'
      ]
    });
  });
});
