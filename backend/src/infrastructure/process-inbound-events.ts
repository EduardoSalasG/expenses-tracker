import { createContainer } from './container.js';
import { loadConfig } from './config.js';
import { InboundMessagingService } from '../interfaces/http/services/inbound-messaging.service.js';

const container = createContainer(loadConfig());
try {
  const processed = await new InboundMessagingService(container).processPending(Number(process.env.INBOUND_EVENT_BATCH_SIZE ?? 25));
  container.logger.info('Inbound event worker finished.', { processed });
} finally {
  await container.close();
}
