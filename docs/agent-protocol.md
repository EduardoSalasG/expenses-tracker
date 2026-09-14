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

## Post-Main Deployment Supervision
Run this after every update pushed to `main`; it is part of the release gate, not an optional follow-up.

1. Release Agent: use `gh run list --branch main` and verify that the backend workflow for the released SHA completes successfully. Inspect failed logs before reporting a failure.
2. Deployment QA Agent: use Netlify CLI/API and verify that the production deploy is `ready` and references the same SHA.
3. Release Agent: verify `https://api.expenses-tracker.eduardosalasg.dev/health` returns `{"status":"ok"}` and the Netlify site returns HTTP 200.
4. Report the SHA, GitHub Actions run, Netlify deploy, and public-check results. Do not call the release complete while any of these is pending or failing.

When the runtime permits parallel agents, delegate the GitHub Actions check, Netlify check, and public smoke check to separate agents. If it does not, the Release Agent performs all three checks directly and records that limitation.
