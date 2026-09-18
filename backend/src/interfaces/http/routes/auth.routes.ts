import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { AuthController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils.js';
import { createOtpRequestRateLimit } from '../middleware/otp-rate-limit.middleware.js';

export function registerAuthRoutes(app: Express, container: AppContainer) {
  const controller = new AuthController(container);
  const otpRequestRateLimit = createOtpRequestRateLimit(container.rateLimits);

  app.post('/auth/register/lead', asyncHandler(controller.saveRegistrationLead));
  app.post('/auth/register', asyncHandler(controller.registerWeb));
  app.post('/auth/login', asyncHandler(controller.loginWeb));
  app.post('/auth/magic-link/request', asyncHandler(controller.requestMagicLink));
  app.post('/auth/magic-link/consume', asyncHandler(controller.consumeMagicLink));
  app.post('/auth/otp/request', otpRequestRateLimit, asyncHandler(controller.requestOtp));
  app.post('/auth/otp/verify', asyncHandler(controller.verifyOtp));
  app.post('/auth/refresh', asyncHandler(controller.refreshSession));
  app.post('/auth/telegram/registration-link', asyncHandler(controller.createTelegramRegistrationLink));
  app.post('/auth/telegram/consume-link-token', asyncHandler(controller.consumeTelegramLinkToken));
}
