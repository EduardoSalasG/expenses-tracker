import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import type { ReportFrequency } from '../domain/types.js';

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const frequency = process.argv[2] as ReportFrequency | undefined;

if (!frequency || !frequencies.includes(frequency)) {
  throw new Error('Expected report frequency argument: daily, weekly, monthly, or yearly.');
}

const config = loadConfig();
const container = createContainer(config);

try {
  const result = await container.useCases.sendDueReports.execute(frequency);

  container.logger.info('Due reports sent.', {
    frequency: result.frequency,
    period: result.period,
    sent: result.sent,
    recipients: result.recipients.map((recipient) => ({
      userId: recipient.userId,
      tenantId: recipient.tenantId,
      phoneNumber: recipient.phoneNumber
    }))
  });
} finally {
  await container.close();
}
