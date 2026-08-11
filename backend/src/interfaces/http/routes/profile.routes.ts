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
  app.get('/accounts', auth, asyncHandler(controller.listAccounts));
  app.post('/accounts', auth, asyncHandler(controller.createAccount));
  app.patch('/accounts/:accountId', auth, asyncHandler(controller.updateAccount));
  app.get('/accounts/:accountId/members', auth, asyncHandler(controller.listAccountMembers));
  app.get('/accounts/:accountId/balances', auth, asyncHandler(controller.listAccountBalances));
  app.get('/accounts/:accountId/settlement-suggestions', auth, asyncHandler(controller.listAccountSettlementSuggestions));
  app.get('/accounts/:accountId/settlements', auth, asyncHandler(controller.listAccountSettlements));
  app.post('/accounts/:accountId/settlements', auth, asyncHandler(controller.createAccountSettlement));
  app.post('/accounts/:accountId/invitations', auth, asyncHandler(controller.createInvitation));
  app.post('/accounts/invitations/:token/accept', auth, asyncHandler(controller.acceptInvitation));
  app.delete('/accounts/:accountId/members/:memberUserId', auth, asyncHandler(controller.removeMember));
  app.get('/me/account-context', auth, asyncHandler(controller.getAccountContext));
  app.put('/me/account-context', auth, asyncHandler(controller.updateAccountContext));
}
