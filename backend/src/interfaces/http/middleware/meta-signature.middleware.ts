import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { RequestWithRawBody } from '../request-with-raw-body.js';

export function verifyMetaSignature(container: AppContainer) {
  return (request: RequestWithRawBody, response: Response, next: NextFunction) => {
    if (!container.config.whatsappAppSecret) {
      container.logger.warn('Meta signature verification skipped because WHATSAPP_APP_SECRET is not configured.');
      next();
      return;
    }

    const signatureHeader = request.header('x-hub-signature-256');
    if (!signatureHeader?.startsWith('sha256=')) {
      container.logger.warn('Meta webhook rejected: missing x-hub-signature-256 header.', {
        hasRawBody: Boolean(request.rawBody?.length)
      });
      response.status(401).json({ error: 'Missing Meta webhook signature.' });
      return;
    }

    const expectedSignature = createHmac('sha256', container.config.whatsappAppSecret)
      .update(request.rawBody ?? Buffer.from(''))
      .digest('hex');
    const actualSignature = signatureHeader.slice('sha256='.length);

    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(actualSignature, 'hex');

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      container.logger.warn('Meta webhook rejected: invalid x-hub-signature-256 header.', {
        expectedLength: expected.length,
        actualLength: actual.length,
        hasRawBody: Boolean(request.rawBody?.length)
      });
      response.status(401).json({ error: 'Invalid Meta webhook signature.' });
      return;
    }

    next();
  };
}
