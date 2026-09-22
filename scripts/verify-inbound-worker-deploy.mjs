import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const workflow = await readFile(new URL('../.github/workflows/deploy-backend-docker.yml', import.meta.url), 'utf8');
const operations = await readFile(new URL('../docs/operations.md', import.meta.url), 'utf8');

assert.match(
  workflow,
  /docker compose run --rm --no-deps --entrypoint sh expenses-tracker-inbound-worker\s+\\?\s*-c ['"]test -f dist\/infrastructure\/process-inbound-events-daemon\.js['"]/
);
assert.match(workflow, /worker_restart_count=\$\(docker inspect expenses-tracker-inbound-worker --format '\{\{\.RestartCount\}\}'\)/);
assert.match(workflow, /Inbound event worker started\./);
assert.match(workflow, /worker_restart_count.*!= "0"/s);

assert.match(operations, /BACKEND_IMAGE=.*<commit-sha>/);
assert.match(operations, /expenses-tracker-backend expenses-tracker-inbound-worker/);
assert.match(operations, /--remove-orphans.*sólo.*API/is);

console.log('Inbound worker deploy safeguards are present.');
