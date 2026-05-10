import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { ProfileController } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware.js';
import { asyncHandler } from '../utils.js';

export function registerProfileRoutes(app: Express, container: AppContainer) {
  const controller = new ProfileController(container);
  const auth = requireAuth(container);

  app.get('/me', auth, asyncHandler(controller.getMe));
  app.put('/me', auth, asyncHandler(controller.updateMe));
}
