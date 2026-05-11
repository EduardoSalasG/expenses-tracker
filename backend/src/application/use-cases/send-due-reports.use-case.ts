import type { ReportFrequency } from '../../domain/types.js';
import type { Clock, UserRepository, WhatsAppProvider } from '../ports.js';
import { formatReportMessage, reportPeriod } from '../services/reporting.service.js';
import type { FinanceUseCases } from './finance.use-cases.js';

export class SendDueReportsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly finance: FinanceUseCases,
    private readonly whatsapp: WhatsAppProvider,
    private readonly clock: Clock
  ) {}

  async execute(frequency: ReportFrequency) {
    const users = await this.users.listByReportFrequency(frequency);
    const period = reportPeriod(frequency, this.clock.now());
    const results = [];

    for (const user of users) {
      const report = await this.finance.report(user.tenantId, period.from, period.to);
      const body = `${user.preferredName}, ${formatReportMessage(frequency, period.label, report)}`;
      await this.whatsapp.sendText(user.phoneNumber, body);
      results.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId });
    }

    return { frequency, period, sent: results.length, recipients: results };
  }
}
