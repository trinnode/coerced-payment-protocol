# Phase C evidence — access, performance and fidelity

Assessment: `/tmp/opencode/experience-report.md` (PASS WITH FIXES). Contrast and
vitals were measured; all sampled text contrast ratios passed (lowest 5.67:1).

| Finding | Fix | Proof |
|---|---|---|
| Mobile menu toggle was an unfocusable SVG; primary nav unreachable by keyboard | Real `<button>` with `aria-label`, `aria-expanded`, `aria-controls`; Escape closes; first link focused on open | `components/ui/resizable-navbar.tsx`, `components/site/nav.tsx` |
| 390px page expanded to 501px via exclusions table | `grid-cols-[minmax(0,1fr)]` and `max-w-full` on scroll wrapper | `app/page.tsx` HardCases |
| Motion animated nav width under reduced motion | `useReducedMotion()` → static width/y/backdrop | `components/ui/resizable-navbar.tsx` |
| No persistent live region; errors used polite status | Always-rendered `aria-live="polite"` plus `role="alert"` for errors | `components/console/incident-actions.tsx` |
| Relative-time hydration mismatch | Absolute timestamp until mounted, then relative | `components/console/queue-table.tsx` |
| Three present-tense claims exceeded the evidence | Rewritten to "design aims", "may", "Gate 0 experiment"; removed asserted prevalence | `app/page.tsx` |

Measured (dev-mode, medians of 3 loads, with the assessor's caveat): desktop `/`
LCP 188ms, CLS .008, INP 16ms; `/protocol` CLS .207 from font swap; console CLS 0.
No raster images. 16 internal links, 0 external, 0 404s. No honesty violations
after the copy changes.
