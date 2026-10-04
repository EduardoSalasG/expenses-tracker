import { createApp } from './interfaces/http/app.js';
import { createContainer } from './infrastructure/container.js';
import { loadConfig } from './infrastructure/config.js';

const config = loadConfig();
const container = createContainer(config);
const app = createApp(container);

const server = app.listen(config.port, () => {
  container.logger.info('api_started', { port: config.port });
});

const shutdown = async (signal: string) => {
  container.logger.info('api_shutdown_requested', { signal });
  server.close(async () => {
    try {
      await container.close();
      container.logger.info('api_stopped');
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
