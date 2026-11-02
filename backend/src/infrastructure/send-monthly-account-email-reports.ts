import { loadConfig } from './config.js';
import { createContainer } from './container.js';

const now = new Date();
const month = process.argv[2] ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
const container = createContainer(loadConfig());
try { console.log(JSON.stringify(await container.useCases.sendMonthlyAccountEmailReports.execute(month))); }
finally { await container.close(); }
