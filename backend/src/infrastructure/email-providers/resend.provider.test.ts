import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config.js';
import { ResendEmailProvider } from './resend.provider.js';

describe('ResendEmailProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('encodes PDF attachments as base64 for the email provider', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const provider = new ResendEmailProvider({
      resendApiKey: 're_test', resendFromEmail: 'reports@example.test', resendApiBaseUrl: 'https://api.resend.test'
    } as AppConfig, { error: vi.fn() } as never);

    await provider.send({
      to: 'ana@example.test', subject: 'Informe', html: '<p>Informe</p>',
      attachments: [{ filename: 'informe.pdf', content: Buffer.from('%PDF-test'), contentType: 'application/pdf' }]
    });

    expect(fetch).toHaveBeenCalledWith('https://api.resend.test/emails', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      attachments: [{ filename: 'informe.pdf', content: Buffer.from('%PDF-test').toString('base64'), content_type: 'application/pdf' }]
    });
  });
});
