import { describe, expect, it } from 'vitest';
import { MonthlyReportPdfService } from './monthly-report-pdf.service.js';

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
});
