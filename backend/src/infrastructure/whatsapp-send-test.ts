import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { WhatsAppCloudProvider } from './messaging-providers/whatsapp.provider.js';

const config = loadConfig();
const logger = createLogger();

const recipient = process.argv[2] ?? config.whatsappTestRecipientPhone;
const message = process.argv.slice(3).join(' ') || 'Expenses Tracker test message from the backend.';

if (!recipient) {
  throw new Error('Missing recipient. Set WHATSAPP_TEST_RECIPIENT_PHONE or pass the phone number as the first argument.');
}

if (!config.whatsappAccessToken || !config.whatsappPhoneNumberId) {
  throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.');
}

const provider = new WhatsAppCloudProvider(config, logger);
const response = await provider.sendText(recipient, message);

logger.info('WhatsApp test message sent.', {
  recipient,
  phoneNumberId: config.whatsappPhoneNumberId,
  businessAccountId: config.whatsappBusinessAccountId || undefined,
  response
});
