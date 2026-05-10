import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import type { AuthenticatedRequest } from '../middleware.js';
import { updateProfileSchema } from '../schemas.js';
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
}
