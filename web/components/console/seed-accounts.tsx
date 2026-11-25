"use client";

/** Small progressive enhancement: fill the seeded account. The form itself is
 *  a native POST and works with JavaScript disabled. */
export function SeedAccounts({
  accounts,
  password,
}: {
  accounts: [string, string][];
  password: string;
}) {
  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="mono-label mb-3">Seeded roles · password below</p>
      <ul className="space-y-1.5">
        {accounts.map(([role, addr]) => (
          <li key={addr} className="flex flex-col gap-0.5">
            <span className="text-[0.7rem] text-ink">{role}</span>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement | null;
                const email = form?.querySelector<HTMLInputElement>('input[name="email"]');
                const pass = form?.querySelector<HTMLInputElement>('input[name="password"]');
                if (email) email.value = addr;
                if (pass) pass.value = password;
                form?.requestSubmit();
              }}
              className="text-left font-mono text-[0.65rem] text-faint hover:text-guard"
            >
              {addr}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
