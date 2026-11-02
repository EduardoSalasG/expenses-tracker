import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '..', '.github', 'workflows', 'deploy-backend-docker.yml');

describe('backend deployment workflow', () => {
  it('prevents every remote docker compose run from consuming the SSH heredoc and verifies the public Push enrollment route', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const remoteRuns = workflow.match(/docker compose run --rm --no-deps[^\n]*/g) ?? [];

    expect(remoteRuns).toHaveLength(4);
    expect(remoteRuns.every((command) => command.includes('-T'))).toBe(true);
    expect(remoteRuns.every((command) => command.includes('--interactive=false'))).toBe(true);
    expect(workflow).toContain('https://${{ env.PUBLIC_API_HOST }}/push/public-key?release=${{ github.sha }}');
    expect(workflow).toContain('Public API did not expose the configured Push enrollment key.');
  });
});
