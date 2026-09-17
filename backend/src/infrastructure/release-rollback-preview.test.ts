import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(process.cwd(), '..');
const previewScript = join(repositoryRoot, 'scripts', 'release-rollback-preview.mjs');
const temporaryRoots: string[] = [];

function run(command: string, argumentsList: string[], cwd: string) {
  const result = spawnSync(command, argumentsList, { cwd, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function createTaggedRepository() {
  const root = mkdtempSync(join(tmpdir(), 'expenses-rollback-'));
  temporaryRoots.push(root);
  run('git', ['init'], root);
  run('git', ['config', 'user.email', 'tests@example.com'], root);
  run('git', ['config', 'user.name', 'Release tests'], root);
  writeFileSync(join(root, 'release.txt'), 'known good release\n');
  run('git', ['add', 'release.txt'], root);
  run('git', ['commit', '-m', 'release fixture'], root);
  run('git', ['tag', '-a', 'v1.2.3', '-m', 'release v1.2.3'], root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('release rollback preview', () => {
  it('resolves an annotated release tag without changing HEAD, tags, or the worktree', () => {
    const root = createTaggedRepository();
    const headBefore = run('git', ['rev-parse', 'HEAD'], root);
    const tagsBefore = run('git', ['tag', '--list'], root);

    const result = spawnSync(process.execPath, [previewScript, '--tag', 'v1.2.3', '--root', root], { encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(headBefore);
    expect(run('git', ['rev-parse', 'HEAD'], root)).toBe(headBefore);
    expect(run('git', ['tag', '--list'], root)).toBe(tagsBefore);
    expect(run('git', ['status', '--porcelain'], root)).toBe('');
  });

  it('rejects malformed release tags before any repository operation', () => {
    const root = createTaggedRepository();

    const result = spawnSync(process.execPath, [previewScript, '--tag', 'release-1.2.3', '--root', root], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('annotated release tag');
    expect(run('git', ['status', '--porcelain'], root)).toBe('');
  });
});
