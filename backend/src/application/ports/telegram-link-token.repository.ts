export interface TelegramLinkTokenRecord {
  token: string;
  chatId: string;
  phoneNumber?: string;
  expiresAt: string;
}

export interface TelegramLinkTokenRepository {
  create(input: { token: string; chatId: string; phoneNumber?: string; expiresAt: Date }): Promise<void>;
  consume(token: string, now: Date): Promise<TelegramLinkTokenRecord | undefined>;
}
