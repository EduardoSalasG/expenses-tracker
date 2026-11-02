import type { MessagingChannel, ReportFrequency } from '../../domain/index.js';

export type ReportDeliveryChannel = MessagingChannel | 'email';

export interface ReportDispatchRepository {
  reserve(input: {
    tenantId: string;
    userId: string;
    financialAccountId?: string;
    channel?: ReportDeliveryChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
  }): Promise<boolean>;
  markSent(input: {
    userId: string;
    financialAccountId?: string;
    channel?: ReportDeliveryChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
  }): Promise<void>;
  markFailed(input: {
    userId: string;
    financialAccountId?: string;
    channel?: ReportDeliveryChannel;
    frequency: ReportFrequency;
    periodFrom: string;
    periodTo: string;
    errorMessage: string;
  }): Promise<void>;
}
