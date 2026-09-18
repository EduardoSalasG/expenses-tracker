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
});
