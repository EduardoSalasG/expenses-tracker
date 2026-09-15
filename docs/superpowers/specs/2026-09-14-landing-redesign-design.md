# Landing redesign — product and interaction brief

## Intent recovered from the product

The public route turns a visitor into a registered user of a bilingual expense tracker. Its honest differentiators are a calm view of money, shared accounts, and optional Telegram capture. It must make that value understandable before sign-in without pretending that preview data is live.

## Direction

Use a restrained editorial composition: a compact utility header, one clear statement, and an annotated product vignette. The page has four moments: promise, a labelled illustrative month, three capabilities, and a final registration prompt. Keep the existing supported claims and bilingual copy; remove repeated visual framing and generic decorative effects.

The visual system uses the existing neutral surfaces and blue action color. Typography, spacing and subtle depth create hierarchy. There is no Three.js scene: it would slow the initial public route, duplicate the product preview's explanatory role, and add motion that does not improve comprehension.

## Accessibility and responsive behavior

- Put the header outside `main` and add a skip link.
- Give navigation and language controls localized names and explicit selected state.
- Give interactive controls at least a 44px target and preserve visible focus rings.
- Mark the dashboard as an example rather than live financial information; use semantic labels for its metric list.
- Preserve reading order from the statement through the primary action; at 320px, wrap header actions without clipping.
- Use only restrained CSS transition effects, disabled under `prefers-reduced-motion`.
- Maintain text contrast against opaque surfaces in light and dark system themes.

## Acceptance criteria

1. The landing keeps the present public routes, registration query parameters, language behavior, public-context locale fallback, and metadata updates.
2. The content is semantically structured with a skip link, header/nav/main/footer landmarks, one H1, ordered process and labelled illustrative preview.
3. Primary registration is visible in the header, hero and final call to action; sign-in remains available without competing visually.
4. The interface works at 320px and desktop widths with 44px actions and reduced-motion support.
5. Both dictionaries contain every new landing key and the frontend builds successfully.
