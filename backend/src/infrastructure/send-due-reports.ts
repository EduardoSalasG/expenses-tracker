import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import type { ReportFrequency } from '../domain/index.js';

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const frequency = process.argv[2] as ReportFrequency | undefined;

if (!frequency || !frequencies.includes(frequency)) {
  throw new Error('Expected report frequency argument: daily, weekly, monthly, or yearly.');
}

const config = loadConfig();
const container = createContainer(config);

try {
  const startedAt = Date.now();
  const result = await container.useCases.sendDueReports.execute(frequency);
  const durationMs = Date.now() - startedAt;

  container.logger.info('Due reports sent.', {
    frequency: result.frequency,
    period: result.period,
    durationMs,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    recipients: result.recipients.map((recipient) => ({
      userId: recipient.userId,
      tenantId: recipient.tenantId,
      phoneNumber: recipient.phoneNumber
    })),
    skippedRecipients: result.skippedRecipients,
    failedRecipients: result.failedRecipients
  });

  if (result.failed > 0) {
    container.logger.warn('Due reports completed with delivery failures.', {
      frequency: result.frequency,
      period: result.period,
      failed: result.failed
    });
    process.exitCode = 1;
  }
} finally {
  await container.close();
}
