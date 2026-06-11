import type { Express } from 'express';
import { PublicController } from '../controllers/public.controller.js';
import { asyncHandler } from '../utils.js';

export function registerPublicRoutes(app: Express) {
  const controller = new PublicController();

  app.get('/public/context', asyncHandler(controller.context));
}
