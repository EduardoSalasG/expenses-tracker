export interface OtpRepository {
  issue(input: {
    phoneNumber: string;
    code: string;
    expiresAt: Date;
    now: Date;
    cooldownMs: number;
  }): Promise<{ issued: true } | { issued: false; retryAfterSeconds: number }>;
  verify(phoneNumber: string, code: string, now: Date): Promise<{ verified: boolean; attemptsExhausted: boolean }>;
}
