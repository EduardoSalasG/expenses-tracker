import type { NextFunction, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { RequestWithRawBody } from '../request-with-raw-body.js';

export function logWebhookAttempt(container: AppContainer) {
  return (request: RequestWithRawBody, _response: Response, next: NextFunction) => {
    container.logger.info('WhatsApp webhook POST attempted.', {
      contentType: request.header('content-type'),
      hasSignature: Boolean(request.header('x-hub-signature-256')),
      rawBodyBytes: request.rawBody?.length ?? 0,
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown'
    });
    next();
  };
}
