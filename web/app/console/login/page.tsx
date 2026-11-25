"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEMO = [
  ["Analyst", "ada.analyst@kite.example.ng"],
  ["Supervisor", "tunde.supervisor@kite.example.ng"],
  ["Compliance", "zainab.compliance@kite.example.ng"],
  ["MMO supervisor", "emeka.ops@adaeze.example.ng"],
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ada.analyst@kite.example.ng");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Sign-in failed");
      return;
    }
    router.push(json.redirect ?? "/console");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-16 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
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

      <form
        onSubmit={submit}
        className="rounded-[var(--radius-card)] border border-line bg-surface p-7"
      >
        <p className="mono-label mb-7">Sign in</p>

        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-md border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-ink outline-none transition-colors focus:border-guard"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="phylax-demo-2026"
            className="mt-2 w-full rounded-md border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-ink outline-none transition-colors focus:border-guard placeholder:text-faint/60"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 border-l-2 border-critical pl-3 text-xs text-critical">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="mt-7 w-full rounded-full bg-guard px-4 py-2.5 text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Enter console"}
        </button>

        <div className="mt-8 border-t border-line pt-6">
          <p className="mono-label mb-3">Seeded roles · password below</p>
          <ul className="space-y-1.5">
            {DEMO.map(([role, addr]) => (
              <li key={addr} className="flex flex-col gap-0.5">
                <span className="text-[0.7rem] text-ink">{role}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(addr);
                    setPassword("phylax-demo-2026");
                  }}
                  className="text-left font-mono text-[0.65rem] text-faint hover:text-guard"
                >
                  {addr}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </main>
  );
}
