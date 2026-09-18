import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

function parseArguments(argumentsList) {
  const tagIndex = argumentsList.indexOf('--tag');
  const rootIndex = argumentsList.indexOf('--root');
  const tag = tagIndex === -1 ? null : argumentsList[tagIndex + 1];
  const root = rootIndex === -1 ? null : argumentsList[rootIndex + 1];

  if (!tag || (rootIndex !== -1 && !root)) {
    throw new Error('Usage: node scripts/release-rollback-preview.mjs --tag vMAJOR.MINOR.PATCH [--root <repository-path>]');
  }

  if (!releaseTagPattern.test(tag)) {
    throw new Error(`Expected an annotated release tag in vMAJOR.MINOR.PATCH format; received ${JSON.stringify(tag)}.`);
  }

  return { tag, root };
}

function git(repositoryRoot, argumentsList) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...argumentsList], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${argumentsList.join(' ')} failed.`);
  }
  return result.stdout.trim();
}

function run() {
  const { tag, root } = parseArguments(process.argv.slice(2));
  const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repositoryRoot = resolve(root ?? scriptRoot);
  const ref = `refs/tags/${tag}`;
  const type = git(repositoryRoot, ['cat-file', '-t', ref]);

  if (type !== 'tag') {
    throw new Error(`${tag} must be an annotated release tag, but ${ref} is ${type}.`);
  }

  const commit = git(repositoryRoot, ['rev-parse', `${tag}^{commit}`]);
  process.stdout.write(`Rollback preview only: ${tag} resolves to ${commit}. No branch, tag, worktree, or deployment was changed.\n`);
}

try {
  run();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
