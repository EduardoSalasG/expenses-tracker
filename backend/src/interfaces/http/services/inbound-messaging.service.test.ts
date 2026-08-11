import { describe, expect, it, vi } from 'vitest';
import { InboundMessagingService } from './inbound-messaging.service.js';

describe('InboundMessagingService', () => {
  it('returns a login link for /web using the public frontend origin', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app/' },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn().mockResolvedValue({ token: 'token-123' })
        },
        processInboundFinanceMessage: {
          execute: vi.fn()
        }
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/web'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('https://expenses-tracker-easg.netlify.app/login?linkToken=token-123'),
      { channel: 'telegram' }
    );
  });

  it('returns a login link for natural language web requests', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn().mockResolvedValue({ token: 'token-456' })
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: 'pasame la web para entrar al dashboard'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('https://expenses-tracker-easg.netlify.app/login?linkToken=token-456'),
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });

  it('returns telegram command help in spanish by default', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      users: {
        findByTelegramChatId: vi.fn().mockResolvedValue(undefined)
      },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn()
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/commands'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Comandos y solicitudes disponibles:'),
      { channel: 'telegram' }
    );
    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Comando: /link +56912345678'),
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });

  it('returns telegram command help in the linked user language', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      users: {
        findByTelegramChatId: vi.fn().mockResolvedValue({ preferredLanguage: 'en' })
      },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn()
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/help'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Available commands and requests:'),
      { channel: 'telegram' }
    );
    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Command: /web'),
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });

  it('returns available Telegram accounts and marks the active one', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      users: {
        findByTelegramChatId: vi.fn().mockResolvedValue({
          id: 'user-1',
          preferredLanguage: 'es'
        })
      },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn()
        },
        financialAccounts: {
          listAccounts: vi.fn().mockResolvedValue([
            { account: { id: 'personal-1', name: 'Personal', type: 'personal' }, role: 'owner' },
            { account: { id: 'shared-1', name: 'Casa común', type: 'shared' }, role: 'member' }
          ]),
          resolveMessagingContext: vi.fn().mockResolvedValue({
            account: { id: 'shared-1', name: 'Casa común', type: 'shared' },
            role: 'member'
          })
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/accounts'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Estas son tus cuentas disponibles en Telegram:'),
      { channel: 'telegram' }
    );
    expect(sendText).toHaveBeenCalledWith(
      '999',
      expect.stringContaining('Casa común [activa] · compartida · member'),
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });

  it('returns the current Telegram account in english for linked users', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      users: {
        findByTelegramChatId: vi.fn().mockResolvedValue({
          id: 'user-1',
          preferredLanguage: 'en'
        })
      },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn()
        },
        financialAccounts: {
          listAccounts: vi.fn(),
          resolveMessagingContext: vi.fn().mockResolvedValue({
            account: { id: 'personal-1', name: 'Personal', type: 'personal' },
            role: 'owner'
          })
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/current'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      'The active account for this chat is "Personal". Use /accounts to view all available accounts and /AccountName to switch.',
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });

  it('asks unlinked Telegram users to connect first before account commands', async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const processInboundFinanceMessage = { execute: vi.fn() };
    const service = new InboundMessagingService({
      logger: { info: vi.fn() },
      config: { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' },
      users: {
        findByTelegramChatId: vi.fn().mockResolvedValue(undefined)
      },
      messaging: { sendText },
      useCases: {
        requestTelegramLinkToken: {
          execute: vi.fn()
        },
        financialAccounts: {
          listAccounts: vi.fn(),
          resolveMessagingContext: vi.fn()
        },
        processInboundFinanceMessage
      }
    } as never);

    await service.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: 'message',
      statuses: [],
      messages: [{
        channel: 'telegram',
        fromPhoneNumber: 'tg:999',
        providerUserId: '999',
        replyTo: '999',
        message: '/accounts'
      }]
    });

    expect(sendText).toHaveBeenCalledWith(
      '999',
      'Tu Telegram aún no está vinculado. Primero conéctalo desde la web o envía /link con tu teléfono registrado.',
      { channel: 'telegram' }
    );
    expect(processInboundFinanceMessage.execute).not.toHaveBeenCalled();
  });
});
