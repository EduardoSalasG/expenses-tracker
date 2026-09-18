export interface RateLimitStore {
  consume(input: { key: string; now: Date; windowMs: number; maximum: number }): Promise<
    { allowed: true } | { allowed: false; retryAfterSeconds: number }
  >;
}
