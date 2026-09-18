import { describe, expect, it } from 'vitest';
import { InMemoryInboundEventStore } from './inbound-event.store.js';

describe('InMemoryInboundEventStore', () => {
  it('deduplicates a provider event and claims it once', async () => {
    const store = new InMemoryInboundEventStore();
    const input = { channel: 'telegram' as const, providerEventId: 'update-1', payload: { message: 'hola' }, now: new Date('2026-09-18T00:00:00Z') };
    expect((await store.enqueue(input)).accepted).toBe(true);
    expect((await store.enqueue(input)).accepted).toBe(false);
    expect((await store.claim({ now: input.now })).map((event) => event.providerEventId)).toEqual(['update-1']);
    expect(await store.claim({ now: input.now })).toEqual([]);
  });

  it('retries with backoff and sends exhausted events to dead letter', async () => {
    const store = new InMemoryInboundEventStore();
    const now = new Date('2026-09-18T00:00:00Z');
    await store.enqueue({ channel: 'telegram', providerEventId: 'retry-1', payload: {}, now });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const [event] = await store.claim({ now: new Date(now.getTime() + 120_000) });
      await store.markFailed({ id: event.id, attempts: attempt, now, errorMessage: 'provider unavailable' });
    }
    expect(await store.claim({ now: new Date(now.getTime() + 120_000) })).toEqual([]);
  });
});
