import { randomUUID } from 'node:crypto';
import type { InboundEventRecord, InboundEventStore } from '../application/ports.js';
import type { DatabasePool } from './database.js';

export class PostgresInboundEventStore implements InboundEventStore {
  constructor(private readonly pool: DatabasePool) {}

  async enqueue(input: { channel: InboundEventRecord['channel']; providerEventId: string; payload: unknown; now: Date }) {
    const result = await this.pool.query(
      `insert into inbound_webhook_events (id, channel, provider_event_id, payload, correlation_id, next_attempt_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (channel, provider_event_id) do nothing returning id`,
      [randomUUID(), input.channel, input.providerEventId, input.payload, randomUUID(), input.now]
    );
    return { accepted: result.rowCount === 1 };
  }

  async claim(input: { now: Date; limit?: number }) {
    const result = await this.pool.query(
      `with candidates as (
        select id from inbound_webhook_events where status = 'pending' and next_attempt_at <= $1
        order by created_at for update skip locked limit $2
      ) update inbound_webhook_events event set status = 'processing', attempts = attempts + 1, updated_at = now()
      from candidates where event.id = candidates.id
      returning event.id, event.channel, event.provider_event_id, event.payload, event.attempts, event.status, event.next_attempt_at`,
      [input.now, input.limit ?? 10]
    );
    return result.rows.map((row): InboundEventRecord => ({
      id: row.id, channel: row.channel, providerEventId: row.provider_event_id, payload: row.payload,
      attempts: row.attempts, status: row.status, nextAttemptAt: row.next_attempt_at
    }));
  }

  async markProcessed(id: string) {
    await this.pool.query(`update inbound_webhook_events set status = 'processed', updated_at = now() where id = $1`, [id]);
  }
}
