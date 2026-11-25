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
| Display | **Zodiak** | An editorial serif with unusual terminals. Reads as a printed record, not a fintech dashboard. Uncommon in this category. |
| Interface | **Familjen Grotesk** | A Swedish grotesk with distinctive letterforms at speed. Neutral enough for long passages, not another variation of the same default sans. |
| Data / protocol | **Azeret Mono** | Wide, high-legibility mono for references, states, amounts and labels. Distinct from the usual developer mono. |

Weights are declared only where a real file exists. The Azeret Mono face is a
variable font covering 100–900; Zodiak has real 400/500/600/700 cuts; Familjen
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
