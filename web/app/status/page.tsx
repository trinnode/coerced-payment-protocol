import Link from "next/link";
import { sql } from "@/lib/db/client";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  let dbState = "up";
  let counts = { incidents: 0, institutions: 0, episodes: 0 };
  try {
    const rows = await sql`
      select
        (select count(*)::int from incidents) as incidents,
        (select count(*)::int from institutions) as institutions,
        (select count(*)::int from episodes) as episodes`;
    counts = rows[0] as typeof counts;
  } catch {
    dbState = "down";
  }

  const items = [
    ["Design record", "Published — v2 after three independent reviews"],
    ["Protocol", "v0.1 draft — no production implementation"],
    ["Console", "Working against seeded records; real auth, guards and audit chain"],
    ["Database", `${dbState} · ${counts.incidents} incidents · ${counts.episodes} episodes · ${counts.institutions} institutions`],
    ["Gate −1 · willingness to pay", "Untested — ten meetings not yet held"],
    ["Gate 0 · buildable and lawful", "Not started — counsel memo and staging replica trial outstanding"],
    ["Institutional partner", "None signed"],
    ["Legal review", "Not commissioned"],
    ["Pilot", "None"],
  ];

  return (
    <>
      <SiteNav />
      <main className="container-page min-h-[70svh] pt-36">
        <p className="mono-label">Status ledger</p>
        <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.4rem,5vw,4rem)] leading-[1.05] tracking-[-0.03em]">
          What exists, and what does not.
        </h1>
        <p className="mt-8 max-w-[60ch] text-[1rem] leading-[1.8] text-muted">
          A safety project that cannot state its own status is asking for trust it
          has not earned. This page is generated from the running database where
          it can be, and says &lsquo;not started&rsquo; everywhere it must.
        </p>

        <dl className="mt-14 border-t border-line-strong">
          {items.map(([k, v]) => (
            <div key={k} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <dt className="text-sm text-ink">{k}</dt>
              <dd className="font-mono text-xs leading-relaxed text-muted">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap gap-8 text-xs">
          <Link href="/plan" className="text-guard underline underline-offset-4">
            Gates and kill criteria →
          </Link>
          <Link href="/review" className="text-muted hover:text-ink">
            Review log
          </Link>
          <Link href="/api/health" className="text-muted hover:text-ink">
            Health endpoint
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
