import type { MessagingChannel } from '../../domain/index.js';

export interface MessagingProvider {
  sendText(toPhoneNumber: string, body: string, options?: { channel?: MessagingChannel }): Promise<unknown>;
}
