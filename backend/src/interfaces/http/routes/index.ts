import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerFinanceRoutes } from './finance.routes.js';
import { registerProfileRoutes } from './profile.routes.js';
import { registerPublicRoutes } from './public.routes.js';
import { registerTelegramWebhookRoutes } from './telegram-webhook.routes.js';

export function registerRoutes(app: Express, container: AppContainer) {
  registerPublicRoutes(app);
  registerAuthRoutes(app, container);
  registerTelegramWebhookRoutes(app, container);
  registerProfileRoutes(app, container);
  registerFinanceRoutes(app, container);
}
