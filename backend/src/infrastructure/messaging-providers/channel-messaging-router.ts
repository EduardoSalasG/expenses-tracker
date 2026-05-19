import type { MessagingChannel } from '../../domain/index.js';
import type { MessagingProvider } from '../../application/ports.js';

export class ChannelMessagingRouter implements MessagingProvider {
  constructor(
    private readonly providers: Partial<Record<MessagingChannel, MessagingProvider>>,
    private readonly fallbackChannel: MessagingChannel = 'whatsapp'
  ) {}

  sendText(toPhoneNumber: string, body: string, options?: { channel?: MessagingChannel }): Promise<unknown> {
    const channel = options?.channel ?? this.fallbackChannel;
    const provider = this.providers[channel] ?? this.providers[this.fallbackChannel];
    if (!provider) throw new Error(`No messaging provider configured for channel "${channel}".`);
    return provider.sendText(toPhoneNumber, body, { channel });
  }
}

