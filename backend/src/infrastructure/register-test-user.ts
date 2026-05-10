import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger();
const pool = createPool(config);

const phoneNumber = process.argv[2] ?? config.whatsappTestRecipientPhone;
const firstName = process.argv[3] ?? 'WhatsApp';
const lastName = process.argv[4] ?? 'Test User';
const preferredName = process.argv[5] ?? firstName;
const email = process.argv[6] ?? null;
const country = process.argv[7] ?? 'Chile';
const currency = process.argv[8] ?? 'CLP';

if (!phoneNumber) {
  throw new Error('Missing phone number. Set WHATSAPP_TEST_RECIPIENT_PHONE or pass it as the first argument.');
}

try {
  const result = await pool.query(
    `select * from upsert_user_by_phone($1, $2, $3, $4, $5, $6, $7)`,
    [phoneNumber, firstName, lastName, preferredName, email, country, currency]
  );
  const user = result.rows[0];
  await pool.query('select seed_default_categories($1)', [user.tenant_id]);

  logger.info('Registered WhatsApp test user.', {
    phoneNumber,
    userId: user.id,
    tenantId: user.tenant_id,
    currency
  });
} finally {
  await pool.end();
}
