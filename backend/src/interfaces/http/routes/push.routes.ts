import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { AuthenticatedRequest } from '../middleware.js';
import { requireAuth } from '../middleware.js';
import { asyncHandler, parseBody } from '../utils.js';

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({ p256dh: z.string().min(1).max(1024), auth: z.string().min(1).max(1024) })
});

export function registerPushRoutes(app: Express, container: AppContainer) {
  app.get('/push/public-key', (_request, response) => {
    if (!container.config.vapidPublicKey) {
      response.status(503).json({ error: 'Push notifications are not configured.' });
      return;
    }
    response.json({ publicKey: container.config.vapidPublicKey });
  });

  app.post('/push/subscriptions', requireAuth(container), asyncHandler(async (request: Request, response: Response) => {
    const body = parseBody(pushSubscriptionSchema, request.body);
    const authRequest = request as AuthenticatedRequest;
    await container.useCases.registerPushSubscription.execute({ userId: authRequest.auth.userId, ...body });
    response.status(204).end();
  }));
}
