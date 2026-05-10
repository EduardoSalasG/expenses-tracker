import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { AppContainer } from '../../infrastructure/container.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import type { RequestWithRawBody } from './request-with-raw-body.js';
import { openApiSpec } from './openapi.js';
import { registerRoutes } from './routes/index.js';

export { extractWhatsAppMessages } from './controllers/whatsapp-webhook.controller.js';

export function createApp(container: AppContainer) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: container.config.frontendOrigin }));
  app.use(express.json({
    verify: (request: RequestWithRawBody, _response, buffer) => {
      request.rawBody = Buffer.from(buffer);
    }
  }));

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  registerRoutes(app, container);

  app.use(errorMiddleware(container));

  return app;
}
