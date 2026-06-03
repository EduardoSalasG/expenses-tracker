import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { consumeTelegramLinkTokenSchema, createTelegramLinkTokenSchema, createTelegramRegistrationLinkSchema, refreshTokenSchema, requestOtpSchema, verifyOtpSchema, webLoginSchema, webRegisterSchema } from '../schemas.js';
import { parseBody } from '../utils.js';

export class AuthController {
  constructor(private readonly container: AppContainer) {}

  requestOtp = async (request: Request, response: Response) => {
    const body = parseBody(requestOtpSchema, request.body);
    response.json(await this.container.useCases.requestOtp.execute(body));
  };

  registerWeb = async (request: Request, response: Response) => {
    const body = parseBody(webRegisterSchema, request.body);
    response.status(201).json(await this.container.useCases.registerWeb.execute(body));
  };

  loginWeb = async (request: Request, response: Response) => {
    const body = parseBody(webLoginSchema, request.body);
    response.json(await this.container.useCases.loginWeb.execute(body));
  };

  createTelegramLinkToken = async (request: Request, response: Response) => {
    const body = parseBody(createTelegramLinkTokenSchema, request.body);
    response.json(await this.container.useCases.requestTelegramLinkToken.execute(body.chatId));
  };

  createTelegramRegistrationLink = async (request: Request, response: Response) => {
    const body = parseBody(createTelegramRegistrationLinkSchema, request.body);
    response.json(await this.container.useCases.createTelegramRegistrationLink.execute(body.phoneNumber));
  };

  consumeTelegramLinkToken = async (request: Request, response: Response) => {
    const body = parseBody(consumeTelegramLinkTokenSchema, request.body);
    response.json(await this.container.useCases.consumeTelegramLinkToken.execute(body.token));
  };

  verifyOtp = async (request: Request, response: Response) => {
    const body = parseBody(verifyOtpSchema, request.body);
    response.json(await this.container.useCases.verifyOtp.execute(body));
  };

  refreshSession = async (request: Request, response: Response) => {
    const body = parseBody(refreshTokenSchema, request.body);
    response.json(await this.container.useCases.refreshSession.execute(body.refreshToken));
  };
}
