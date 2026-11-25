import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";

export const metadata: Metadata = { title: "Console" };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-base">
      <header className="sticky top-0 z-40 border-b border-line bg-base/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[110rem] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-display text-lg leading-none text-ink">
              Phylax
            </Link>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="mono-label hidden sm:block">Incident console</span>
          </div>
          <span className="font-mono text-[0.6875rem] text-faint">
            {process.env.NODE_ENV === "production" ? "LIVE DATA" : "LOCAL · SEEDED DATA"}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
