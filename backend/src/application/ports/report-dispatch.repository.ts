import type { MessagingChannel, ReportFrequency } from '../../domain/index.js';

export interface ReportDispatchRepository {
  reserve(input: {
    tenantId: string;
    userId: string;
    channel?: MessagingChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
  }): Promise<boolean>;
  markSent(input: {
    userId: string;
    channel?: MessagingChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
  }): Promise<void>;
  markFailed(input: {
    userId: string;
    channel?: MessagingChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
    errorMessage: string;
  }): Promise<void>;
}
