# Agent Protocol

## Purpose
Use agents to reduce integration mistakes, not to fragment ownership.

## Sequence
1. Design
2. Implement
3. Technical review
4. Functional QA
5. Release

## Inputs and Outputs
- Design
  - Input: user request, current repo state
  - Output: scope, touched areas, risks, acceptance criteria
- Implement
  - Input: approved scope
  - Output: code, tests, docs updates
- Technical review
  - Input: diff + build/test results
  - Output: findings or approval
- Functional QA
  - Input: runnable feature
  - Output: validated flows, visible issues, device notes
- Release
  - Input: approved change on `dev`
  - Output: commit, push, merge `dev -> main`, deployment supervision, final status

## Mandatory Checks
- Build affected apps.
- Run relevant tests.
- Verify migrations/bootstrap impact when persistence changes.
- Verify Swagger for API changes.
- Verify README/diagrams for setup or workflow changes.
- Verify i18n when public/private copy changes.
- For any release, run `pnpm run version:check`; root `package.json` is canonical and the backend manifest, frontend manifest, and generated frontend version module must match it exactly.

## Session Continuity and Budget

1. At the beginning of a session, read the latest `docs/next-session-handoff-*.md`, compare it against `git status` and recent commits, and report any drift before implementation.
2. When the agent cannot see the 5-hour usage meter, ask the user for the current percentage before a non-trivial slice. Reserve enough budget for discovery, TDD, implementation, verification, documentation, and commit.
3. Do not start a slice that cannot be safely closed within the reported budget. Prefer a documented handoff to an incomplete code change.
4. Before a low-budget pause or session end, update/create the handoff with: reported budget, branch/commit, completed and pending OpenSpec tasks, tests/build evidence, blockers, known gaps, and the exact next slice.
5. A handoff is context, not source of truth. Structural and behavioral claims still require Codebase Memory coverage and direct source or test evidence.

## Escalation Rules
- Stop and redesign if the change breaks contracts across backend/frontend/database.
- Do not merge mixed-purpose changes in one release commit unless they are technically inseparable.
- Prefer explicit test gaps over pretending coverage exists.

## Release Gate
- Clean `git status`
- `dev` pushed
- review completed
- QA completed
- merge to `main`
- push `main`
- record the resulting immutable `main` SHA
- create and push an annotated `vMAJOR.MINOR.PATCH` tag on that exact SHA
- complete release notes and preserve post-deploy evidence

Do not tag `dev`, reuse/move an existing tag, or create a retroactive tag for the historical `0.1.0` baseline. Before any rollback operation, use the read-only preview command documented in `docs/versioning.md` to identify the known-good tag and SHA.

## Post-Main Deployment Supervision
Run this after every update pushed to `main`; it is part of the release gate, not an optional follow-up.

1. Release Agent: use `gh run list --branch main` and verify that the backend workflow for the released SHA completes successfully. Inspect failed logs before reporting a failure.
2. Deployment QA Agent: use Netlify CLI/API and verify that the production deploy is `ready` and references the same SHA.
3. Release Agent: verify `https://api.expenses-tracker.eduardosalasg.dev/health` returns `{"status":"ok"}`, the public Swagger contract exposes `subcategoryId` in `GET /expenses`, and the Netlify site returns HTTP 200.
4. Report the SHA, GitHub Actions run, Netlify deploy, and public-check results. Do not call the release complete while any of these is pending or failing.

When the runtime permits parallel agents, delegate the GitHub Actions check, Netlify check, and public smoke check to separate agents. If it does not, the Release Agent performs all three checks directly and records that limitation.
