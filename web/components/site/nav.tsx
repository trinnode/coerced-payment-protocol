"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";

const LINKS = [
  { name: "The problem", link: "/#problem" },
  { name: "The design", link: "/#design" },
  { name: "Protocol", link: "/protocol" },
  { name: "Safety", link: "/safety" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onConsole = pathname?.startsWith("/console");

  return (
    <Navbar className="top-0">
      <NavBody>
        <Link href="/" className="group flex items-baseline gap-2.5 pl-1">
          <span className="font-display text-[1.35rem] leading-none tracking-tight text-ink">
            Phylax
          </span>
          <span className="mono-label hidden translate-y-[1px] sm:inline">design record</span>
        </Link>

        <NavItems items={LINKS} />

        <div className="flex items-center gap-2">
          <Link
            href="/status"
            className="mono-label hidden px-3 py-2 transition-colors hover:text-ink md:block"
          >
            status
          </Link>
          <NavbarButton
            as={Link}
            href={onConsole ? "/console" : "/console/login"}
            variant="dark"
            className="rounded-full border border-line-strong bg-raised px-4 py-2 text-[0.8125rem] text-ink hover:border-guard/40 hover:bg-guard-deep/40"
          >
            {onConsole ? "Console" : "Open console"}
          </NavbarButton>
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <Link href="/" className="font-display text-xl text-ink">
            Phylax
          </Link>
          <MobileNavToggle isOpen={open} onClick={() => setOpen(!open)} />
        </MobileNavHeader>
        <MobileNavMenu isOpen={open} onClose={() => setOpen(false)}>
          {LINKS.map((l) => (
            <Link
              key={l.link}
              href={l.link}
              onClick={() => setOpen(false)}
              className="w-full py-3 text-base text-muted hover:text-ink"
            >
              {l.name}
            </Link>
          ))}
          <NavbarButton
            as={Link}
            href="/console/login"
            variant="dark"
            className="mt-2 w-full rounded-full border border-line-strong bg-raised py-3 text-center text-sm"
          >
            Open console
          </NavbarButton>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
