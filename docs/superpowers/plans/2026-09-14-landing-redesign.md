# Landing redesign implementation plan

> **For implementation:** execute one coherent task at a time with focused test coverage and a build check after each completed slice.

**Goal:** Redesign the public landing as a minimal, bilingual conversion experience that truthfully previews the product and meets accessible semantic and responsive expectations.

**Architecture:** Keep the landing as a standalone Angular component and reuse the public route, `I18nService`, `PublicContextService`, metadata behavior and Material buttons/icons. Replace the component template and add component-scoped CSS for the layout and reduced-motion behavior. Do not add Three.js or change backend/public APIs.

## Task 1: Define the observable landing contract

**Files:**
- Create: `frontend/src/app/features/landing.component.spec.ts`
- Modify: `frontend/src/app/features/landing.component.ts`

1. Add focused component tests for metadata, locale selection, the skip link, labelled language selector and illustrative preview semantics.
2. Run the test and observe the expected failure where the environment allows it.
3. Add the minimal semantic template/controller changes that make the contract pass.
4. Run focused tests and record any environment-level browser blocker.

## Task 2: Implement the visual hierarchy and responsive details

**Files:**
- Modify: `frontend/src/app/features/landing.component.ts`
- Modify: `frontend/src/styles.css` only if a shared token is necessary
- Modify: `frontend/src/app/core/i18n.service.ts`

1. Implement the four-page-moment composition and localized copy needed by new labels.
2. Use component CSS for minimal material, responsive grid stacking, 44px controls, focus-visible treatment and reduced-motion handling.
3. Preserve all route/query-param, public language and metadata behavior.
4. Run frontend build.

## Task 3: Functional and accessibility review

**Files:**
- Modify only when review identifies a concrete issue.

1. Inspect desktop and 320px layout in the browser.
2. Keyboard-check skip link, language switcher and each route CTA.
3. Run frontend build and available focused tests.
4. Run Impeccable's detector after the UI settles and resolve material findings.
