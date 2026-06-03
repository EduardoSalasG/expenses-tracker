export interface EmailMagicLinkTokenRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface EmailMagicLinkTokenRepository {
  create(input: { token: string; userId: string; expiresAt: Date }): Promise<void>;
  consume(token: string, now: Date): Promise<EmailMagicLinkTokenRecord | undefined>;
}
