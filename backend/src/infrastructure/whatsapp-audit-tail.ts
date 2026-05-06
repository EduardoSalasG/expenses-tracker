import { createPool } from './database.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const pool = createPool(config);
const limit = Number(process.argv[2] ?? 20);

try {
  const result = await pool.query(
    `select created_at, provider_message_id, from_phone_number, parsing_status, message, expense_id
     from whatsapp_messages
     order by created_at desc
     limit $1`,
    [limit]
  );

  console.table(result.rows);
} finally {
  await pool.end();
}
