import { randomUUID } from 'node:crypto';
import type { InboundEventRecord, InboundEventStore } from '../application/ports.js';
import type { MessagingChannel } from '../domain/index.js';

export class InMemoryInboundEventStore implements InboundEventStore {
  private readonly events = new Map<string, InboundEventRecord>();

  async enqueue(input: { channel: MessagingChannel; providerEventId: string; payload: unknown; now: Date }) {
    const key = `${input.channel}:${input.providerEventId}`;
    if (this.events.has(key)) return { accepted: false };
    this.events.set(key, {
      id: randomUUID(), channel: input.channel, providerEventId: input.providerEventId,
      payload: input.payload, attempts: 0, status: 'pending', nextAttemptAt: input.now
    });
    return { accepted: true };
  }

  async claim(input: { now: Date; limit?: number }) {
    return [...this.events.values()]
      .filter((event) => event.status === 'pending' && event.nextAttemptAt <= input.now)
      .slice(0, input.limit ?? 10)
      .map((event): InboundEventRecord => {
        event.status = 'processing';
        event.attempts += 1;
        return { ...event };
      });
  }
}
