import type { ReportFrequency } from '../../domain/index.js';
import type { Clock, MessagingProvider, ReportDispatchRepository, UserRepository } from '../ports.js';
import { formatReportMessage, reportPeriod } from '../services/reporting.service.js';
import type { FinanceUseCases } from './finance.use-cases.js';

export class SendDueReportsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly finance: FinanceUseCases,
    private readonly messaging: MessagingProvider,
    private readonly dispatches: ReportDispatchRepository,
    private readonly clock: Clock
  ) {}

  async execute(frequency: ReportFrequency) {
    const users = await this.users.listByReportFrequency(frequency);
    const period = reportPeriod(frequency, this.clock.now());
    const sent = [];
    const skipped = [];
    const failed = [];

    for (const user of users) {
      if (!user.telegramChatId) {
        skipped.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId, reason: 'telegram_not_linked' });
        continue;
      }

      const reserved = await this.dispatches.reserve({
        tenantId: user.tenantId,
        userId: user.id,
        frequency,
        periodFrom: period.from,
        periodTo: period.to,
        channel: 'telegram'
      });
      if (!reserved) {
        skipped.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId, reason: 'already_sent' });
        continue;
      }

      try {
        const report = await this.finance.report(user.tenantId, period.from, period.to);
        const body = `${user.preferredName}, ${formatReportMessage(frequency, period.label, report, user.preferredLanguage ?? 'es')}`;
        await this.messaging.sendText(user.telegramChatId, body, { channel: 'telegram' });
        await this.dispatches.markSent({
          userId: user.id,
          frequency,
          periodFrom: period.from,
          periodTo: period.to,
          channel: 'telegram'
        });
        sent.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await this.dispatches.markFailed({
          userId: user.id,
          frequency,
          periodFrom: period.from,
          periodTo: period.to,
          channel: 'telegram',
          errorMessage: message
        });
        failed.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId, error: message });
      }
    }

    return {
      frequency,
      period,
      sent: sent.length,
      recipients: sent,
      skipped: skipped.length,
      skippedRecipients: skipped,
      failed: failed.length,
      failedRecipients: failed
    };
  }
}
