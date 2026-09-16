import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { AppContainer } from '../../../infrastructure/container.js';

export function errorMiddleware(container: AppContainer) {
  return (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const requestId = (_request as Request & { id?: string }).id ?? crypto.randomUUID();
    container.logger.error('HTTP error', { error: toSafeErrorMetadata(error), requestId });
    if (isOtpThrottleError(error)) {
      response.set('Retry-After', String(error.retryAfterSeconds)).status(429).json({ error: 'Too many OTP requests.' });
      return;
    }
    if (isApplicationError(error)) {
      response.status(error.status).json({ error: error.message, code: error.code, requestId });
      return;
    }
    if (error instanceof ZodError) {
      response.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', requestId });
      return;
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Invalid')) {
      response.status(400).json({ error: message, requestId });
      return;
    }
    response.status(500).json({ error: 'Internal server error.', requestId });
  };
}

function toSafeErrorMetadata(error: unknown) {
  if (!(error instanceof Error)) return { kind: typeof error };

  const candidate = error as { code?: unknown; status?: unknown };
  return {
    name: error.name,
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    ...(typeof candidate.status === 'number' ? { status: candidate.status } : {})
  };
}

function isApplicationError(error: unknown): error is { status: 400 | 401 | 403 | 404 | 409 | 422; code: string; message: string } {
  const candidate = error as { status?: unknown; code?: unknown };
  return error instanceof Error && typeof candidate.status === 'number' &&
    [400, 401, 403, 404, 409, 422].includes(candidate.status) &&
    typeof candidate.code === 'string';
}

function isOtpThrottleError(error: unknown): error is { code: 'OTP_COOLDOWN'; retryAfterSeconds: number } {
  return typeof error === 'object' && error !== null &&
    'code' in error && (error as { code?: unknown }).code === 'OTP_COOLDOWN' &&
    'retryAfterSeconds' in error && typeof (error as { retryAfterSeconds?: unknown }).retryAfterSeconds === 'number';
}
