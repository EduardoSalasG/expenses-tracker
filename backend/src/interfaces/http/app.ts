import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { AppContainer } from '../../infrastructure/container.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import type { RequestWithRawBody } from './request-with-raw-body.js';
import { openApiSpec } from './openapi.js';
import { registerRoutes } from './routes/index.js';

export function createApp(container: AppContainer) {
  const app = express();
  app.use(helmet());
  // In dev, when exposing the API via ngrok, the Origin will be the ngrok domain.
  // Allow configuring multiple allowed origins via comma-separated FRONTEND_ORIGIN.
  // Set FRONTEND_ORIGIN="*" to allow any origin (dev only).
  const frontendOrigin = container.config.frontendOrigin?.trim();
  const allowAll = frontendOrigin === '*';
  const allowList = allowAll
    ? []
    : (frontendOrigin ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin/curl
      if (allowAll) return callback(null, true);
      if (allowList.length === 0) return callback(null, false);
      return callback(null, allowList.includes(origin));
    }
  }));
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
