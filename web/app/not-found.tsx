import Link from "next/link";
import { Wordmark } from "@/components/site/brand";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70svh] flex-col justify-center py-24">
      <Wordmark />
      <p className="mono-label mt-16">404 · no such record</p>
      <h1 className="mt-6 max-w-[20ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.1] tracking-[-0.03em]">
        This page is not in the record.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[1rem] leading-[1.8] text-muted">
        The document you asked for does not exist, or was never published. Nothing
        here implies a case, an institution, or a decision.
      </p>
      <div className="mt-10 flex flex-wrap gap-8 text-sm">
        <Link href="/" className="border-b border-guard/50 pb-1 text-guard hover:border-guard">
          Return to the record →
        </Link>
        <Link href="/status" className="text-muted hover:text-ink">
          Status ledger
        </Link>
      </div>
    </main>
  );
}
