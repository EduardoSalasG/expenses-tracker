# Agents

This repo supports a multi-agent workflow, but all changes still land through `dev` first and only then `main`.

## Branching
- Work on `dev` by default.
- Merge `dev -> main` only after verification and release checks.
- If a hotfix lands on `main`, regularize `dev` immediately.

## Agent Roles
1. Design Agent
   - Defines scope, touched modules, risks, migrations, docs impact, and acceptance criteria.
2. Implementation Agent
   - Makes the code changes, updates tests, Swagger, READMEs, and diagrams when behavior changes.
3. Technical Review Agent
   - Reviews diffs for regressions, contract drift, missing migration work, missing i18n, and missing docs.
4. Functional QA Agent
   - Validates the user flow end to end on desktop/mobile when UI or messaging flows are affected.
5. Release Agent
   - Runs the release checklist and controls promotion from `dev` to `main`.

## Required Flow
1. Design before code for non-trivial changes.
2. Implement in the smallest coherent slice possible.
3. Verify build/tests for affected surfaces.
4. Update living documentation when behavior changes.
5. Commit on `dev`.
6. Merge to `main` only after review + QA + release gate.

## Definition of Done
- Backend builds if backend changed.
- Frontend builds if frontend changed.
- Relevant tests pass or test gaps are stated explicitly.
- Swagger is updated for API contract changes.
- READMEs/diagrams are updated for workflow, setup, or architecture changes.
- No unreviewed local changes remain mixed into the release commit.

## Repo Notes
- `backend/`: Express + TypeScript + Zod + Winston + PostgreSQL adapters.
- `frontend/`: Angular + Material + Tailwind.
- `database/`: migrations, bootstrap, seed, query notes.
- `docs/`: architecture, operations, diagrams.

See `docs/agent-protocol.md` for the operating protocol.
