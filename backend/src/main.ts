import { createApp } from './interfaces/http/app.js';
import { createContainer } from './infrastructure/container.js';
import { loadConfig } from './infrastructure/config.js';

const config = loadConfig();
const container = createContainer(config);
const app = createApp(container);

app.listen(config.port, () => {
  container.logger.info(`API listening on port ${config.port}`);
});
