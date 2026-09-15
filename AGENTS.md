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
   - Runs the release checklist, controls promotion from `dev` to `main`, and supervises every production deployment after the `main` push.

## Required Flow
1. At session start, read the newest `docs/next-session-handoff-*.md`, compare it with `git status`/recent commits, and report any drift. The handoff is planning context only: use Codebase Memory and source validation before relying on structural claims.
2. Ask for the remaining 5-hour usage percentage before opening a non-trivial slice when it is not visible. Estimate whether there is enough budget for discovery, TDD, implementation, verification, documentation, and commit; do not begin a slice that cannot be closed safely. Record the reported budget, completed work, blockers, verification evidence, next slice, and known gaps in a handoff before stopping or yielding a low-budget session.
3. Design before code for non-trivial changes.
4. After a plan is approved, refine it with OpenSpec before implementation. If OpenSpec is unavailable, record that limitation and ask for direction before substituting another planning format.
5. Use Superpowers to structure discovery, design, planning, implementation, debugging, and verification. Use Codebase Memory first for structural code discovery and traceability; validate index coverage and read source directly when coverage is incomplete or stale.
6. For frontend work, use Impeccable for UX/UI, accessibility, responsive, performance, and visual-system reviews; use Apple Design for interaction, typography, motion, feedback, reduced-motion, and spatial-consistency decisions. Preserve or deliberately improve the established visual system rather than introducing unrelated styling. Design mobile-first because mobile is the primary user context; verify at 320 px, a representative mobile width, and desktop, including touch targets, reachability, keyboard access, zoom, loading/error/empty states, and reduced-motion behavior.
7. Implement in the smallest coherent slice possible.
8. Verify build/tests for affected surfaces.
9. Update living documentation when behavior changes.
10. Commit on `dev`.
11. Group compatible changes on `dev` and select a Semantic Versioning (`MAJOR.MINOR.PATCH`) increment before release. Update `CHANGELOG.md`, version manifests, release notes, and the frontend version display together.
12. Merge `dev` to `main` only after review + QA + release gate. Create and push an annotated `vMAJOR.MINOR.PATCH` tag on the exact promoted `main` commit; record its immutable SHA so rollback targets the last healthy tag.
13. After every `main` push, monitor the matching GitHub Actions run, the Netlify production deploy, and public health checks before closing the release. Then synchronize `main` back to `dev`.

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
