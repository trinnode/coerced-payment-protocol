import Link from "next/link";
import { Timeline } from "@/components/ui/timeline";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="main">
        <Opening />
        <Ledger />
        <Envelope />
        <Problem />
        <Design />
        <HardCases />
        <Gates />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}

/* ── Opening ──────────────────────────────────────────────────────────────── */

function Opening() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="container-page relative z-10 min-h-[72svh] pb-14 pt-32 lg:pb-20">
        <div>
          <p className="mono-label">Open design record · v0.1 · 25 Nov 2026</p>

          <h1 className="mt-10 max-w-[19ch] font-display text-[clamp(3.1rem,8.5vw,7rem)] leading-[0.98] tracking-[-0.035em] text-balance">
            Somebody is standing over the phone.
          </h1>

          <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14">
            <p className="max-w-[46ch] text-[1.0625rem] leading-[1.75] text-muted">
              Not a hacker. A person in the room — at a checkpoint, in a parked
              car, in a family house. The transfer is made with the victim&apos;s
              own PIN, on their own device. Every control the bank ran passed,
              because the bank asked the right question of the wrong fact: did
              this person authorise it? They did. Were they free to refuse?
              Nobody asked.
            </p>
            <p className="max-w-[46ch] text-[1.0625rem] leading-[1.75] text-muted">
              This is the gap we are working on. Not better authentication —
              authentication already works. A way to say, in the few seconds
              that matter, that the PIN was given under threat. And a way for
              the receiving institution to learn it while there may still be time to act.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/assessment"
              className="group inline-flex items-center gap-2 border-b border-guard/50 pb-1 text-sm text-guard transition-colors hover:border-guard"
            >
              Read the assessment
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/console/login"
              className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Open the working console
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Status ledger ────────────────────────────────────────────────────────── */

const STATUS = [
  ["Assessment", "v2 · survived three reviews"],
  ["Protocol", "v0.1 · draft, no production deployment"],
  ["Institutional partner", "none signed"],
  ["Willingness to pay", "untested"],
  ["Legal review", "not commissioned"],
  ["Pilot", "none"],
];

function Ledger() {
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="container-page py-10">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
          <p className="mono-label">Where this actually is</p>
          <p className="text-sm italic text-faint">Six lines. Five are empty.</p>
        </div>
        <dl className="grid gap-x-10 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
          {STATUS.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between gap-4 border-t border-line py-3"
            >
              <dt className="flex items-center gap-2.5 text-sm text-ink">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    v.startsWith("v2") || v.startsWith("v0")
                      ? "bg-guard"
                      : v.startsWith("untested") || v.startsWith("not")
                        ? "bg-signal"
                        : "bg-critical"
                  }`}
                />
                {k}
              </dt>
              <dd
                className={`text-right font-mono text-[0.75rem] ${
                  v.startsWith("v2") || v.startsWith("v0")
                    ? "text-guard"
                    : v.startsWith("untested") || v.startsWith("not")
                      ? "text-signal"
                      : "text-critical"
                }`}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-7 max-w-[62ch] text-sm leading-relaxed text-faint">
          We publish this rather than a traction slide. The next milestone is
          not code. It is ten meetings with one question: would you sign six
          months, and at what number?
        </p>
      </div>
    </section>
  );
}

/* ── The envelope ─────────────────────────────────────────────────────────── */

const ENVELOPE = [
  ['"institution_id"', '"bank_kite"'],
  ['"episode_id"', '"…4f2a"'],
  ['"event_type"', '"SUSPECTED_DURESS"'],
  ['"activation.confidence"', '"BANK_AUTHENTICATED"'],
  ['"activation.band"', '"PIN_ONLY_TIER_1"'],
  ['"signature"', '"Ed25519 · key_id …"'],
];

function Envelope() {
  return (
    <section className="container-page border-b border-line py-24 lg:py-32">
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-24">
        <div>
          <p className="mono-label">§ 01 · What crosses</p>
          <h2 className="mt-6 max-w-[24ch] font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.1] tracking-[-0.025em]">
            The signal is smaller than you think.
          </h2>
          <p className="mt-8 max-w-[62ch] text-[1rem] leading-[1.85] text-muted">
            No name. No account number. No location. No note about what happened
            — that note could be read by someone standing over the phone.
          </p>
          <p className="mt-5 max-w-[62ch] text-[1rem] leading-[1.85] text-muted">
            What crosses is an institution, an episode, an event type, a bank-authenticated
            confidence, a value band, and a signature. Six fields, one of which
            is proof that the others came from a bank. Everything else stays
            where the victim is.
          </p>
          <p className="mt-7 font-mono text-[0.7rem] text-faint">
            Specimen only. Events posted to /api/v1/events are signature-verified.
          </p>
        </div>

        <CardContainer
          containerClassName="py-0 w-full"
          className="w-full max-w-md"
        >
          <CardBody className="h-auto w-full">
            <CardItem
              translateZ={40}
              className="w-full overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-surface shadow-[0_30px_80px_-40px_rgba(0,0,0,.9)]"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="mono-label">Signed envelope</span>
                <span className="font-mono text-[0.625rem] text-guard">v0.1</span>
              </div>
              <dl className="divide-y divide-line/70">
                {ENVELOPE.map(([k, v]) => (
                  <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                    <dt className="font-mono text-[0.6875rem] text-faint">{k}</dt>
                    <dd className="break-all font-mono text-[0.6875rem] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-line px-5 py-4">
                <p className="text-[0.7rem] leading-relaxed text-faint">
                  Canonical bytes, signed with the institution&apos;s key. No free text.
                </p>
              </div>
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>
    </section>
  );
}

/* ── Problem ──────────────────────────────────────────────────────────────── */

function Problem() {
  return (
    <section id="problem" className="container-page scroll-mt-24 py-28 lg:py-36">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-24">
        <div>
          <p className="mono-label">§ 02 · The problem</p>
          <h2 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] tracking-[-0.025em]">
            The money moves in seconds. The process moves in weeks.
          </h2>

          <div className="mt-12 max-w-[66ch] space-y-6 text-[1rem] leading-[1.85] text-muted">
            <p>
              NIP transfers settle in seconds. When a person is forced to make
              one, the victim&apos;s complaint, the bank&apos;s investigation,
              and the dispute process all begin after the fact. By then the
              receiving account has usually emptied.
            </p>
            <p>
              The obvious answer — build a better dispute rail — runs into an
              uncomfortable fact. NIBSS&apos;s existing dispute system, IDRS,
              is built around issuers, acquirers and cards. It handles
              representment, arbitration and acquirer-initiated refunds. There
              is no equivalent account-to-account path for a transfer that was
              technically authorised and substantively forced.
            </p>
            <p>
              So the work is not to invent a new rail. It is to make the first
              sixty seconds count: get a minimal, signed signal from the
              sending institution to the receiving one, and give a human there
              something they could act on — if a lawful power exists. That power is not yet agreed with any institution.
            </p>
          </div>
        </div>

        <aside className="lg:pt-24">
          <p className="mono-label mb-5">What exists today</p>
          <ul className="space-y-4 border-t border-line">
            {[
              ["NIP", "instant account-to-account, no duress state"],
              ["IDRS", "issuer/acquirer disputes — card and POS-centric"],
              ["Step-up", "proves possession, not willingness"],
              ["Alerts", "fire below the app; cannot be suppressed safely"],
            ].map(([k, v]) => (
              <li key={k} className="border-b border-line pb-4">
                <p className="font-mono text-xs text-guard">{k}</p>
                <p className="mt-1 text-sm leading-snug text-faint">{v}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/sources"
            className="mt-6 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            See the source register →
          </Link>
        </aside>
      </div>
    </section>
  );
}

/* ── Design ───────────────────────────────────────────────────────────────── */

const LOOPS = [
  {
    n: "01",
    speed: "seconds",
    title: "Signal",
    where: "inside the sending institution",
    body: "A second PIN entry, inside a value band where no step-up exists at all. The design requires duress and ordinary transfers to produce the same request, the same alert, the same statement line — no bypass flag and no extra channel. Whether a real bank can achieve that is the Gate 0 experiment; it may fail.",
    no: "It does not hide the transfer. The victim sees the debit like any other debit. Concealing the money is both impossible and wrong.",
  },
  {
    n: "02",
    speed: "minutes",
    title: "Preservation",
    where: "sending institution → receiving institution",
    body: "A signed, minimal event crosses to the receiving side: institution, episode, a bank-authenticated confidence, the value band. No name, no account number, no location, no free text. The receiving institution decides what to do under its own standing rules — a lien, a positive pay directive, an injunction — each to be named and approved before any case, not improvised during one.",
    no: "It does not freeze anything. Our first pilot proves fast human referral, not a hold. The hold rule comes later, after there is evidence to negotiate with.",
  },
  {
    n: "03",
    speed: "hours to weeks",
    title: "Accountability",
    where: "inside each institution, then between them",
    body: "One coercion can produce several transfers. We group them in one episode, attach each signed event, and write the authority reference beside every decision. Recipients can challenge without the notification endangering the sender. The record is destroyed at closure unless a named statute requires retention — a history of ‘this person was coerced’ is a standing target, not an asset.",
    no: "It does not decide who was at fault. The platform holds facts and states; it never holds a verdict.",
  },
];

function Design() {
  return (
    <section id="design" className="scroll-mt-24 border-y border-line bg-surface/30">
      <div className="container-page py-28 lg:py-36">
        <p className="mono-label">§ 03 · The design</p>
        <h2 className="mt-6 max-w-[24ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] tracking-[-0.025em]">
          Three loops, at three speeds.
        </h2>
        <p className="mt-6 max-w-[62ch] text-[1rem] leading-[1.8] text-muted">
          The original playbook built the third loop and called it the product.
          A complaint system that works in a week is not useful to someone whose
          money left in four seconds. The order matters.
        </p>

        <div className="mt-20">
            <div className="space-y-24">
              {LOOPS.map((l) => (
                <article
                  key={l.n}
                  className="grid gap-7 border-t border-line pt-8 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-10"
                >
                  <div>
                    <p className="font-mono text-sm text-guard">{l.n}</p>
                    <p className="mt-3 font-display text-2xl uppercase leading-none tracking-[-0.02em] text-guard sm:text-3xl">
                      {l.speed}
                    </p>
                  </div>
                  <div className="max-w-[70ch]">
                    <h3 className="font-display text-3xl leading-tight text-ink">
                      {l.title}
                    </h3>
                    <p className="mono-label mt-3 normal-case tracking-normal">
                      {l.where}
                    </p>
                    <p className="mt-6 text-[1rem] leading-[1.85] text-muted">{l.body}</p>
                    <p className="mt-6 border-l-2 border-critical/50 pl-4 text-sm leading-relaxed text-faint">
                      <span className="text-critical">Does not.</span> {l.no}
                    </p>
                  </div>
                </article>
              ))}
            </div>
        </div>
      </div>
    </section>
  );
}

const REFUSALS = [
  {
    t: "We will not fake a receipt or a balance.",
    b: "SMS and push alerts are generated below the app. Suppress one and the absence is louder than the message. Falsify a balance and the bank has falsified its own books. The transfer stays visible. We conceal the signal, never the money.",
  },
  {
    t: "We will not freeze an account on a signal.",
    b: "A signal is not proof and proof is not a verdict. A hold needs a named legal power, a value cap, a time cap, and someone accountable. Those are negotiated before a case exists, not during one.",
  },
  {
    t: "We will not make a discretionary police referral.",
    b: "The modal reported case involves a person with perceived authority — sometimes an agent. An automatic referral can expose the victim to the very person holding them. Statutory reporting to the NFIU under MLPPA 2022 is a separate, disclosed duty of the institution. It is not our feature.",
  },
  {
    t: "We will not score a person as guilty.",
    b: "No labels on recipients, no corridor scoring, no ethnicity proxies hiding inside a column called ‘risk’. A falsely restricted recipient is a real person with a real complaint.",
  },
  {
    t: "We will not claim it works before it has been tried.",
    b: "The decisive test is not a simulator. It is one bank's staging replica, paired normal and duress trials, and people paid to tell the difference. If more than one in five can, the claim dies.",
  },
];

const LIMITS: [string, string][] = [
  ["USSD users", "A large share of the people most exposed to checkpoint and agent coercion cannot use this at all."],
  ["ATM · POS · agent cash-out", "The fastest loss path is untouched."],
  ["Feature phones", "No coverage."],
  ["Above the PIN band", "Step-up exists; a bypass flag or a missing OTP is the tell. High-value transfers are out of scope."],
  ["Minors · adults lacking capacity", "Safeguarding and guardianship unresolved. Excluded rather than improvised."],
  ["Disability · low literacy", "No tested alternative interaction; the PIN band may be inaccessible."],
  ["Shared devices", "Mitigated at enrolment. Not solved."],
];

/* ── Hard cases: refusals and exclusions, in one spread ──────────────────── */

function HardCases() {
  return (
    <section className="border-y border-line bg-critical-deep/20">
      <div className="container-page py-28 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
          <div>
            <p className="mono-label text-critical">§ 04 · Hard cases</p>
            <h2 className="mt-6 max-w-[26ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] tracking-[-0.025em]">
              A safety feature that protects the least exposed is a marketing artefact.
            </h2>
            <p className="mt-6 max-w-[62ch] text-[1rem] leading-[1.8] text-muted">
              Every refusal below was proposed, taken seriously, and removed after
              an independent review. Every exclusion below is someone we do not
              reach. Both are printed before any invitation to work with us.
            </p>
          </div>
          <div className="lg:pt-20">
            <p className="mono-label mb-4">In the record</p>
            <p className="text-sm leading-[1.8] text-faint">
              The review log is public. If you think one of these refusals is
              wrong, that is exactly the argument we want to have.
            </p>
            <Link
              href="/review"
              className="mt-5 inline-block border-b border-guard/50 pb-1 text-xs text-guard hover:border-guard"
            >
              Read the review log →
            </Link>
          </div>
        </div>

        <div className="mt-16 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="mono-label mb-5">Things we will not build</p>
            <ol className="border-t border-line">
              {REFUSALS.map((r, i) => (
                <li key={r.t} className="grid gap-3 border-b border-line py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                  <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <div className="max-w-[56ch]">
                    <h3 className="text-base font-medium text-ink">{r.t}</h3>
                    <p className="mt-2 text-sm leading-[1.75] text-muted">{r.b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="mono-label mb-5">Known exclusions</p>
            <p className="mb-6 max-w-[52ch] text-sm leading-relaxed text-faint">
              This is a feature for smartphone banking customers in a defined
              value band. It does not protect everyone, and the people it does
              not protect are often the most exposed.
            </p>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line-strong">
                    <th className="mono-label w-40 pb-4 pr-5">Excluded</th>
                    <th className="mono-label pb-4">Consequence</th>
                  </tr>
                </thead>
                <tbody>
                  {LIMITS.map(([k, v]) => (
                    <tr key={k} className="border-b border-line align-top">
                      <td className="py-3.5 pr-5 font-mono text-[0.6875rem] text-ink">{k}</td>
                      <td className="py-3.5 text-[0.8125rem] leading-relaxed text-muted">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Gates ────────────────────────────────────────────────────────────────── */

const GATES = [
  {
    title: "Gate −1 · Will anyone pay? · NOT STARTED",
    content: (
      <div>
        <p className="font-mono text-xs text-guard">30 days · ~£2.5k · not started</p>
        <p className="mt-3 text-sm leading-[1.8] text-muted">
          Ten meetings: four tier-1 banks, four MMOs and PSPs, two insurers. One
          ask — sign six months, or name the number and the budget cycle. Pass
          at two signatures or three named figures from named budget holders.
          Zero is an answer, and it costs £2,500 rather than a year.
        </p>
      </div>
    ),
  },
  {
    title: "Gate 0 · Buildable and lawful? · NOT STARTED",
    content: (
      <div>
        <p className="font-mono text-xs text-guard">90 days · ~£6k</p>
        <p className="mt-3 text-sm leading-[1.8] text-muted">
          A scoped counsel memo on licensing, lawful basis, hold powers and duty
          of care. A bank mobile-auth and notification engineer confirming the
          band-scoped path in writing. And the staging-replica paired trial —
          pre-registered kill at 20% detection. Any one fails: stop, or pivot to
          the accountability-only product.
        </p>
      </div>
    ),
  },
  {
    title: "Pilot · One institution · NOT STARTED",
    content: (
      <div>
        <p className="font-mono text-xs text-guard">6 months · £150–300k</p>
        <p className="mt-3 text-sm leading-[1.8] text-muted">
          One corridor, capped value, staff-supervised. Measured in minutes to
          notice and unsafe-contact incidents — not alerts sent. The first
          version proves fast referral, because a hold rule needs evidence to
          negotiate with and does not exist yet. Any unsafe contact pauses the
          pilot and triggers independent review.
        </p>
      </div>
    ),
  },
  {
    title: "Phase 2 · Second institution · NOT STARTED",
    content: (
      <div>
        <p className="font-mono text-xs text-guard">months 10–18</p>
        <p className="mt-3 text-sm leading-[1.8] text-muted">
          A different core and auth stack, so the protocol is not one bank&apos;s
          internal API. Then — and only then — the standing hold rule, with a
          named power, a value cap, a duration cap, and a route for the recipient
          to challenge.
        </p>
      </div>
    ),
  },
];

function Gates() {
  return (
    <section className="container-page py-28 lg:py-36">
      <p className="mono-label">§ 06 · The sequence</p>
      <h2 className="mt-6 max-w-[24ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] tracking-[-0.025em]">
        Four gates. The default at each one is no.
      </h2>
      <p className="mt-6 max-w-[62ch] text-[1rem] leading-[1.8] text-muted">
        Each gate has criteria fixed before the work starts. The cheapest
        falsifiable claim goes first: whether anyone will pay, before whether
        it can be built.
      </p>
      <div className="mt-16">
        <Timeline data={GATES} />
      </div>
    </section>
  );
}

/* ── Closing ──────────────────────────────────────────────────────────────── */

function Closing() {
  return (
    <section className="border-t border-line bg-surface/40">
      <div className="container-page py-28 lg:py-32">
        <p className="mono-label">§ 07 · An invitation</p>
        <p className="mt-8 max-w-[30ch] font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.18] tracking-[-0.02em] text-balance">
          Nothing here is proven. Tell us where it is wrong.
        </p>
        <p className="mt-8 max-w-[60ch] text-[1rem] leading-[1.85] text-muted">
          If you run fraud operations, if you have sat in a compliance meeting
          about this, or if you have been through it yourself — the useful thing
          is the objection. We publish every review that changed the design,
          including the ones that killed parts of it. That log is the reason to
          trust anything on this page, not the page itself.
        </p>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
          <Link
            href="/review"
            className="border-b border-guard/50 pb-1 text-sm text-guard hover:border-guard"
          >
            What reviewers found →
          </Link>
          <Link href="/protocol" className="text-sm text-muted hover:text-ink">
            The protocol, open for criticism
          </Link>
          <Link href="/status" className="text-sm text-muted hover:text-ink">
            Status ledger
          </Link>
        </div>
      </div>
    </section>
  );
}
