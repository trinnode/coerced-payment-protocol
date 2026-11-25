import Link from "next/link";
import { Wordmark } from "@/components/site/brand";

/**
 * Footer in the Aceternity idiom: an oversized wordmark that anchors the page,
 * then a quiet grid. No newsletter capture, no social icons pretending to be a
 * brand — this is a design record, and the footer says who made it and what it
 * is not.
 */
export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-line">
      <div className="container-page py-16 lg:py-20">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12">
          <div>
            <p className="font-display text-title leading-tight tracking-[-0.03em] text-ink">
              A safer signal
              <br />
              when consent
              <br />
              is taken away.
            </p>
            <p className="mt-5 max-w-xs text-body leading-relaxed text-muted">
              An open design record for coerced-payment signalling. Published so
              it can be argued with, not so it can be bought.
            </p>
          </div>

          <FooterCol
            title="Record"
            links={[
              ["Assessment", "/assessment"],
              ["Master flow", "/flow"],
              ["Master plan", "/plan"],
              ["Threat model", "/safety"],
            ]}
          />
          <FooterCol
            title="Protocol"
            links={[
              ["Specification v0.1", "/protocol"],
              ["Status ledger", "/status"],
              ["Review log", "/review"],
              ["Sources", "/sources"],
            ]}
          />
          <FooterCol
            title="Working"
            links={[
              ["Console", "/console/login"],
              ["Governance", "/governance"],
              ["Contributing", "/contributing"],
              ["Security", "/security"],
            ]}
          />
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2.5">
              <Wordmark />
            </p>
            <p
              aria-hidden
              className="select-none font-display text-[clamp(3rem,11vw,9rem)] leading-[0.85] tracking-[-0.04em] text-line-strong"
            >
              Phylax
            </p>
          </div>
          <div className="flex flex-col gap-1 md:items-end">
            <p className="mono-label">Lagos · London · the internet</p>
            <p className="text-label leading-relaxed text-faint">
              Text © the contributors, CC BY 4.0. Code Apache-2.0. Not a regulated
              financial service.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mono-label mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-body text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
