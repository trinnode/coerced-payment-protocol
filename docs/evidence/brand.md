# Brand evidence

Reference direction: negative-space logo principles — one core idea, subtraction
over addition, legibility at 16px, no hidden detail that dies at small size.

Initial mark was judged **WEAK**: literal shield plus typed `P`, no actual signal
in the geometry, and a different drawing in the favicon.

Final mark: shield broken at bowl height, interior stem and open bowl, amber
signal crossing the gap. `phylax-mark.svg`, `brand.tsx` and `icon.svg` share
identical path data.

Verified:

- Both standalone SVGs parse as XML; no raster, external `href` or `url()`.
- `/icon.svg` → 200 `image/svg+xml`; Next emits `<link rel="icon" href="/icon.svg?…">`.
- `/opengraph-image` → 200 `image/png`, 1200×630.
- `/manifest.webmanifest` → 200 `application/manifest+json`.
- Branded `/not-found` → 404 with the Wordmark.
- React marks are `aria-hidden` with no duplicate accessible name; keyboard focus
  reaches the home link and the mobile menu's first link.
- Computed shield stroke is `--color-guard` (13.07:1 on base).
- 320/390/768/1440: no horizontal overflow; mobile toggle fits.
- `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm test` 49/49, `pnpm e2e` 32/32.

Advisories closed: unused Aceternity `NavbarLogo` (external raster) deleted;
`docs/design.md` now describes the SVG lockup and the manual token-sync rule.
