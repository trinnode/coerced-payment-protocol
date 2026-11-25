import Link from "next/link";
import { SeedAccounts } from "@/components/console/seed-accounts";

export const dynamic = "force-dynamic";

const DEMO: [string, string][] = [
  ["Analyst", "ada.analyst@kite.example.ng"],
  ["Supervisor", "tunde.supervisor@kite.example.ng"],
  ["Compliance", "zainab.compliance@kite.example.ng"],
  ["MMO supervisor", "emeka.ops@adaeze.example.ng"],
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const showSeed =
    process.env.NODE_ENV !== "production" && process.env.SEED_DEMO_ACCOUNTS !== "false";

  return (
    <main id="main" className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-16 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
      <div>
        <p className="mono-label">Institution access</p>
        <h1 className="mt-6 max-w-[20ch] font-display text-[clamp(2.4rem,5vw,4rem)] leading-[1.05] tracking-[-0.03em]">
          A case queue, not a verdict machine.
        </h1>
        <p className="mt-8 max-w-[52ch] text-[1rem] leading-[1.8] text-muted">
          Every action here is scoped to your institution. Corrections require an
          authority reference. Closure requires a reason. Nothing changes a
          balance, and nothing contacts the police.
        </p>
        <p className="mt-6 max-w-[52ch] text-sm leading-relaxed text-faint">
          This is the working prototype against seeded records. The data is
          synthetic but the flows, guards and audit chain are the real ones.
        </p>
        <Link href="/status" className="mt-8 inline-block text-xs text-guard underline underline-offset-4">
          What is and is not built →
        </Link>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
        <p className="mono-label mb-7">Sign in</p>

        <form action="/api/auth/login-form" method="post">
          <label className="block">
            <span className="text-xs text-muted">Email</span>
            <input
              type="email"
              name="email"
              required
              defaultValue="ada.analyst@kite.example.ng"
              className="mt-2 w-full rounded-md border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-ink focus:border-guard"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-xs text-muted">Password</span>
            <input
              type="password"
              name="password"
              required
              className="mt-2 w-full rounded-md border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-ink placeholder:text-faint/60 focus:border-guard"
            />
          </label>

          {error && (
            <p role="alert" className="mt-4 border-l-2 border-critical pl-3 text-xs text-critical">
              Invalid credentials.
            </p>
          )}

          <button
            type="submit"
            className="mt-7 w-full rounded-full bg-guard px-4 py-2.5 text-sm font-medium text-base transition-opacity hover:opacity-90"
          >
            Enter console
          </button>
        </form>

        {showSeed && <SeedAccounts accounts={DEMO} password="phylax-demo-2026" />}
      </div>
    </main>
  );
}
