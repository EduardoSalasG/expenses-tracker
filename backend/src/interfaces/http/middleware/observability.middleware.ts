import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../infrastructure/logger.js';

type ObservabilityRequest = Request & { id?: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestCorrelationMiddleware() {
  return (request: ObservabilityRequest, response: Response, next: NextFunction) => {
    const suppliedRequestId = request.header('x-request-id')?.trim();
    const requestId = suppliedRequestId && uuidPattern.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
    request.id = requestId;
    response.setHeader('X-Request-ID', requestId);
    next();
  };
}

export function httpRequestLoggingMiddleware(logger: Pick<AppLogger, 'info'>) {
  return (request: ObservabilityRequest, response: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      logger.info('http_request_completed', {
        requestId: request.id ?? randomUUID(),
        method: request.method,
        route: normalizeRoute(request),
        statusCode: response.statusCode,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000
      });
    });
    next();
  };
}

function normalizeRoute(request: Request) {
  const routePath = request.route?.path;
  return typeof routePath === 'string' ? routePath : 'unmatched';
}
