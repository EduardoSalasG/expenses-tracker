import type { MessagingChannel } from '../../domain/index.js';

export interface InboundEventRecord {
  id: string;
  channel: MessagingChannel;
  providerEventId: string;
  payload: unknown;
  attempts: number;
  status: 'pending' | 'processing' | 'processed' | 'dead_letter';
  nextAttemptAt: Date;
}

export interface InboundEventStore {
  enqueue(input: { channel: MessagingChannel; providerEventId: string; payload: unknown; now: Date }): Promise<{ accepted: boolean }>;
  claim(input: { now: Date; limit?: number }): Promise<InboundEventRecord[]>;
  markProcessed(id: string): Promise<void>;
  markFailed(input: { id: string; attempts: number; now: Date; errorMessage: string }): Promise<void>;
}
