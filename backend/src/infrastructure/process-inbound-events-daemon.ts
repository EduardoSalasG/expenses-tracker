import { InboundMessagingService } from '../interfaces/http/services/inbound-messaging.service.js';
import { createContainer } from './container.js';
import { loadConfig } from './config.js';
import { startInboundEventWorkerDaemon } from './inbound-event-worker-daemon.js';

const container = createContainer(loadConfig());
const service = new InboundMessagingService(container);

await startInboundEventWorkerDaemon({ container, service });
