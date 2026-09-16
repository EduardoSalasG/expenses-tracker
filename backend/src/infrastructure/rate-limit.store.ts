import type { RateLimitStore } from '../application/ports.js';

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly requests = new Map<string, number[]>();

  async consume(input: { key: string; now: Date; windowMs: number; maximum: number }) {
    const now = input.now.getTime();
    const timestamps = (this.requests.get(input.key) ?? []).filter((timestamp) => timestamp > now - input.windowMs);
    if (timestamps.length >= input.maximum) {
      return {
        allowed: false as const,
        retryAfterSeconds: Math.max(1, Math.ceil((timestamps[0] + input.windowMs - now) / 1000))
      };
    }
    this.requests.set(input.key, [...timestamps, now]);
    return { allowed: true as const };
  }
}
