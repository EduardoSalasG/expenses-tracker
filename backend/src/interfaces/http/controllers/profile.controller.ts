import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { AuthenticatedRequest } from '../middleware.js';
import {
  createFinancialAccountInvitationSchema,
  createFinancialAccountSchema,
  selectFinancialAccountSchema,
  updateFinancialAccountSchema,
  updateProfileSchema
} from '../schemas.js';
import { parseBody } from '../utils.js';

export class ProfileController {
  constructor(private readonly container: AppContainer) {}

  getMe = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.users.findById(authRequest.auth.userId));
  };

  updateMe = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateProfileSchema, request.body);
    response.json(await this.container.useCases.updateProfile.execute(authRequest.auth.userId, body));
  };

  listAccounts = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.financialAccounts.listAccounts(authRequest.auth.userId));
  };

  createAccount = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createFinancialAccountSchema, request.body);
    response.status(201).json(await this.container.useCases.financialAccounts.createSharedAccount({
      userId: authRequest.auth.userId,
      tenantId: authRequest.auth.tenantId,
      sourceFinancialAccountId: authRequest.auth.financialAccountId,
      name: body.name,
      currency: body.currency
    }));
  };

  updateAccount = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateFinancialAccountSchema, request.body);
    response.json(await this.container.useCases.financialAccounts.renameSharedAccount({
      actorUserId: authRequest.auth.userId,
      financialAccountId: readRouteParam(request, 'accountId'),
      name: body.name
    }));
  };

  listAccountMembers = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.financialAccounts.listMembers(
      authRequest.auth.userId,
      readRouteParam(request, 'accountId')
    ));
  };

  createInvitation = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createFinancialAccountInvitationSchema, request.body);
    response.status(201).json(await this.container.useCases.financialAccounts.inviteMember({
      actorUserId: authRequest.auth.userId,
      financialAccountId: readRouteParam(request, 'accountId'),
      email: body.email,
      phoneNumber: body.phoneNumber,
      role: body.role ?? 'member'
    }));
  };

  acceptInvitation = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.financialAccounts.acceptInvitation({
      actorUserId: authRequest.auth.userId,
      token: readRouteParam(request, 'token')
    }));
  };

  removeMember = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.financialAccounts.removeMember({
      actorUserId: authRequest.auth.userId,
      financialAccountId: readRouteParam(request, 'accountId'),
      memberUserId: readRouteParam(request, 'memberUserId')
    }));
  };

  getAccountContext = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await this.container.useCases.financialAccounts.getAccountContext(
      authRequest.auth.userId,
      authRequest.auth.financialAccountId
    ));
  };

  updateAccountContext = async (request: Request, response: Response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(selectFinancialAccountSchema, request.body);
    const accountContext = await this.container.useCases.financialAccounts.selectAccount(
      authRequest.auth.userId,
      body.financialAccountId
    );
    const user = await this.container.users.findById(authRequest.auth.userId);
    if (!user) {
      response.status(404).json({ error: 'User not found.' });
      return;
    }

    response.json({
      account: accountContext.account,
      accounts: await this.container.useCases.financialAccounts.listAccounts(authRequest.auth.userId),
      accessToken: this.container.tokens.signAccessToken(user, accountContext.account.id),
      refreshToken: this.container.tokens.signRefreshToken(user, accountContext.account.id)
    });
  };
}

function readRouteParam(request: Request, key: string) {
  const value = request.params[key];
  return Array.isArray(value) ? value[0] : value;
}
