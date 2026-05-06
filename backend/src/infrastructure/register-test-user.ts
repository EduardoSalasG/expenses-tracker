import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger();
const pool = createPool(config);

const phoneNumber = process.argv[2] ?? config.whatsappTestRecipientPhone;
const name = process.argv[3] ?? 'WhatsApp Test User';
const email = process.argv[4] ?? null;
const country = process.argv[5] ?? 'Chile';
const currency = process.argv[6] ?? 'CLP';

if (!phoneNumber) {
  throw new Error('Missing phone number. Set WHATSAPP_TEST_RECIPIENT_PHONE or pass it as the first argument.');
}

try {
  const result = await pool.query(
    `select * from upsert_user_by_phone($1, $2, $3, $4, $5)`,
    [phoneNumber, name, email, country, currency]
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
