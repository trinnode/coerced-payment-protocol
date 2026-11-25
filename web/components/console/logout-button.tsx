"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/console/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-muted hover:text-ink"
      >
        <span className="hidden sm:inline">{name}</span>
        <span className="rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[0.625rem] uppercase text-faint">
          {role}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded-md border border-line bg-raised p-1 shadow-xl">
          <button
            onClick={logout}
            className="w-full rounded px-3 py-2 text-left text-xs text-muted hover:bg-surface hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
