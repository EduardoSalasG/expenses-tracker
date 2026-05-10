import type { NextFunction, Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';

export function errorMiddleware(container: AppContainer) {
  return (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    container.logger.error('HTTP error', { error });
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    response.status(message.includes('Invalid') ? 400 : 500).json({ error: message });
  };
}
