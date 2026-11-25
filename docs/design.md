# Design rationale

## Why this does not look like a startup site

The subject is a person under coercion. A page that greets them with three
feature cards, a gradient button and a testimonial would be making a claim about
the people who built it: that they are selling something and would like the
visitor to feel good about buying it.

That is not the posture this project can honestly take. The significant facts
are negative ones — what cannot be hidden, what cannot be guaranteed, what has
not been tested. So the site is built like a document: numbered sections, a
status ledger at the top, tables for the exclusions, an ordered list for the
refusals, and a timeline for the gates. There is one atmospheric background at
the opening and one scroll-linked beam through the three loops. Everything else
is type and rules.

The most important copy on the page is the ledger. Six lines, five of them
empty. A reader who sees that before seeing any call to action is being told
the truth at the moment it is most useful.

## Typefaces

Chosen to be distinctive without being costume. All are downloaded as `.woff2`
and served locally — no runtime font CDN, no layout shift from a third party.

| Role | Face | Why |
|---|---|---|
| Display | **Gloock** | An editorial serif with unusual terminals. Reads as a printed record, not a fintech dashboard. Uncommon in this category. |
| Interface | **Familjen Grotesk** | A Swedish grotesk with distinctive letterforms at speed. Neutral enough for long passages, not another variation of the same default sans. |
| Data / protocol | **Azeret Mono** | Wide, high-legibility mono for references, states, amounts and labels. Distinct from the usual developer mono. |

Weights are declared only where a real file exists. The Azeret Mono face is a
variable font covering 100–900; Gloock has real 400/500/600/700 cuts; Familjen
Grotesk is a variable 400–700 cut.

## Colour

Deep green-black surfaces, bone ink, one protective green, one attention amber,
one harm clay. Semantic colours are used for state, never for decoration. Body
text and small labels are checked against the base surface at WCAG AA; the
small uppercase mono labels use the lighter `--color-faint` token specifically
because they are information, not ornament.

## Motion

Restrained by policy. The Aceternity `Spotlight` runs once at the opening;
`TracingBeam` follows the three loops; `Timeline` advances through the gates.
Reduced motion is handled in CSS globally. No element fades in on every scroll,
nothing loops indefinitely, and no motion is required to understand the record.

## Aceternity usage

Components come from the public registry and are vendored as source. The header
is the real `resizable-navbar`. Aceternity does not publish a footer component,
so the footer follows its idiom — oversized wordmark, restrained link grid —
rather than pretending to be a vendored file.

---

## Implementation system (visual audit, 25 Nov 2026)

### Type ladder

The scale is defined once in `app/globals.css` as `@theme` tokens and paired
with default line heights. Tailwind's own `text-xs` / `text-sm` / `text-base` /
`text-lg` already sit at 12 / 14 / 16 / 18 px, so they are left intact and the
ladder is extended with named steps rather than redefining built-ins. Page-level
utility classes written by hand were left untouched; these tokens are the
reference those classes should converge on.

| Token | px | Used for |
| --- | --- | --- |
| `--text-micro` | 11 | dense data only (rare) |
| `--text-label` | 12 | mono labels, table heads, metadata, code blocks |
| `--text-body` | 14 | interface body, footer links |
| `--text-copy` | 16 | document body (`.doc-prose`) |
| `--text-lead` | 18 | lede, subhead, small wordmark |
| `--text-title` | 24 | footer statement, nav wordmark |
| `--text-heading` | 32 | document h1 floor |
| `--text-display` | 48 | document h1 ceiling |
| `--text-hero` | 72 | hero ceiling |

Mono labels moved from 11 px / 0.12 em to 12 px / 0.09 em: the wider Azeret
Mono at 11 px read as hairlines, while 12 px keeps the label information rather
than ornament. Body copy in `.doc-prose` is 16 px at 1.78 line height, capped at
68 ch; paragraphs site-wide use `text-wrap: pretty`.

### Rhythm and rules

`--measure-page` (78 rem), `--measure-copy` (68 ch), `--space-gutter` (2 rem)
and a `--space-xs … --space-xl` cadence replace one-off dimensions where the
system owns them. Section rhythm in document prose uses `--space-section` /
`--space-section-wide`. The `hairline` utility is now a solid 1 px `--color-line`
rule instead of a fading gradient, so every divider reads the same way. The
footer grid uses one 40/48 px gap at each breakpoint. The root layout declares
`data-scroll-behavior="smooth"` so Next 16 can coordinate route transitions with
the CSS rule, and takes its theme colour from a single constant matching
`--color-base`.

### Contrast — measured

Ratios computed from the WCAG relative-luminance formula, not estimated by eye.
AA normal text requires 4.5:1; AA large text requires 3:1.

| Token | on `--color-base` | on `--color-surface` | on `--color-raised` |
| --- | --- | --- | --- |
| `--color-ink` | 17.06:1 | 16.29:1 | 15.45:1 |
| `--color-muted` | 7.71:1 | 7.37:1 | 6.99:1 |
| `--color-faint` | 5.67:1 | 5.41:1 | 5.13:1 |
| `--color-guard` | 13.07:1 | 12.49:1 | 11.84:1 |
| `--color-signal` | 10.87:1 | 10.38:1 | 9.85:1 |
| `--color-critical` | 6.92:1 | 6.60:1 | 6.26:1 |

Every text token clears AA on all three surfaces, including the 12 px mono
label. `--color-guard-deep`, `--color-signal-deep` and `--color-critical-deep`
are fills, not text: as text on base they measure 1.71 / 1.50 / 1.30:1 and must
never be used for type. Composited cases used in the UI also pass: faint on the
`critical-deep/20` band is 5.48:1; guard on `guard-deep/40` over raised is
10.23:1. The oversized footer wordmark uses `--color-line-strong` (1.68:1 on
base) and is `aria-hidden` decoration, so it is exempt as non-text content.

One genuine failure was found outside the editable components: the console
login used `placeholder:text-faint/60`, which composites to **2.67:1** on base.
Placeholders are text, so a global rule now resolves them to `--color-muted`
(**7.71:1**) without editing that page.

### Brand mark and navigation

The mark is typographic, not an image: a 2 px guard hairline (`.brand-rule`),
the display face at 24 px in the nav and 18 px on mobile / in the footer, with
`-0.03em` tracking, followed by the `design record` mono label where there is
room. The footer repeats the same lockup above its oversized aria-hidden echo,
so the two ends of the page state the same identity.

The vendored `NavItems` owns its own anchors, so `SiteNav` applies
`aria-current` to the matching anchor after render (`page` for routes,
`location` for in-page sections). Current items render in guard green with a
short guard rule; the mobile equivalent uses a left bar. Desktop hover uses the
stock nav pill, and all header links share one 160 ms `--ease-guard` colour
transition. The labelled `<nav>`, button toggle, Escape handler and focus
handling are preserved; focus on open now lands on the first menu link rather
than the wordmark.

### Verification

Keyboard and Playwright checks at 320 / 390 / 768 / 1024 / 1440 px: no
horizontal overflow; `document.documentElement.scrollWidth` never exceeded the
viewport width (310 / 380 / 758 / 1014 / 1430 px against the same viewports
minus the scrollbar). The mobile menu, current state and Escape close were
exercised at 320 and 390 px. Reduced motion remains handled by the global
`prefers-reduced-motion` block, alongside the vendored components' own reduced
motion paths.

### Known issue outside this change set

The four `public/fonts/gloock-*.woff2` files are not Gloock. Their font name
tables report `General Sans` (500/600) or an empty/`false` family (400/700),
which is why the rendered display face is a sans rather than the intended
editorial serif. The CSS family names stay `Gloock` as required; the font files
and the fetch script are outside this edit scope and must be repopulated with
genuine Gloock `.woff2` files before release.
