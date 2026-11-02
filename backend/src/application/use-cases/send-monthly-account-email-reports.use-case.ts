import type { EmailProvider, FinancialAccountRepository, ReportDispatchRepository } from '../ports.js';
import { MonthlyReportPdfService } from '../services/monthly-report-pdf.service.js';
import { monthPeriod } from '../services/reporting.service.js';
import type { FinanceUseCases } from './finance.use-cases.js';

export class SendMonthlyAccountEmailReportsUseCase {
  constructor(private readonly accounts: Pick<FinancialAccountRepository, 'listAll' | 'listMembers'>, private readonly finance: FinanceUseCases, private readonly dispatches: ReportDispatchRepository, private readonly email: EmailProvider, private readonly pdf = new MonthlyReportPdfService()) {}
  async execute(month: string) {
    const period = monthPeriod(month); let sent = 0; let skipped = 0; let failed = 0;
    for (const account of await this.accounts.listAll()) {
      const report = await this.finance.report(account.tenantId, account.id, period.from, period.to);
      const pdf = await this.pdf.render({ accountName: account.name, periodLabel: month, expenses: Object.entries(report.expenseTotalsByCurrency).map(([currency, total]) => ({ currency, total })), incomes: Object.entries(report.incomeTotalsByCurrency).map(([currency, total]) => ({ currency, total })), categories: report.expenseVariationByCategory.map((row) => ({ name: row.categoryName, currency: row.currency, total: row.currentTotal })) });
      for (const member of (await this.accounts.listMembers(account.id)).filter((item) => item.status === 'active' && item.email)) {
        const input = { tenantId: account.tenantId, userId: member.userId, financialAccountId: account.id, channel: 'email' as const, frequency: 'monthly' as const, periodFrom: period.from, periodTo: period.to };
        if (!await this.dispatches.reserve(input)) { skipped += 1; continue; }
        try { await this.email.send({ to: member.email!, subject: `Informe mensual · ${account.name}`, html: `<p>Adjuntamos tu informe mensual de <strong>${account.name}</strong>.</p>`, text: `Informe mensual ${account.name}.`, attachments: [{ filename: `informe-${month}.pdf`, content: pdf, contentType: 'application/pdf' }] }); await this.dispatches.markSent(input); sent += 1; }
        catch (error) {
          failed += 1;
          await this.dispatches.markFailed({ ...input, errorMessage: error instanceof Error ? error.message : 'Email delivery failed.' });
        }
      }
    }
    return { month, sent, skipped, failed };
  }
}
