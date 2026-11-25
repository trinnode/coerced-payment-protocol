import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Mark } from "@/components/site/brand";

export const metadata: Metadata = { title: "Console" };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-base">
      <header className="sticky top-0 z-40 border-b border-line bg-base/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[110rem] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2" aria-label="Phylax — home">
              <Mark className="h-5 w-5" />
              <span className="font-display text-lg leading-none text-ink">Phylax</span>
            </Link>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="mono-label hidden sm:block">Incident console</span>
          </div>
          <span className="font-mono text-[0.6875rem] text-faint">
            {process.env.NEXT_PUBLIC_DEPLOY_ENV === "production"
              ? "LIVE DATA"
              : process.env.NEXT_PUBLIC_DEPLOY_ENV === "staging"
                ? "STAGING · SEEDED DATA"
                : process.env.NODE_ENV === "production"
                  ? "UNLABELLED · SEEDED DATA"
                  : "LOCAL · SEEDED DATA"}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
