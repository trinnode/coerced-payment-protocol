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
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { name: "The problem", link: "/#problem" },
  { name: "The design", link: "/#design" },
  { name: "Protocol", link: "/protocol" },
  { name: "Safety", link: "/safety" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const pathname = usePathname();
  const onConsole = pathname?.startsWith("/console");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<HTMLDivElement | null>(null);

  /* Hash links only own the current state while the reader is on the home page. */
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const sectionLink =
    pathname === "/"
      ? LINKS.find((l) => l.link === `/#${hash.replace(/^#/, "")}`)?.link
      : undefined;
  const activeHref = sectionLink ?? pathname ?? "/";

  const currentValue = (href: string) =>
    href === activeHref ? (href.includes("#") ? "location" : "page") : undefined;

  /* NavItems renders its own anchors, so mark the current one after render. */
  useEffect(() => {
    const root = itemsRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      const value =
        href === activeHref ? (href.includes("#") ? "location" : "page") : undefined;
      if (value) a.setAttribute("aria-current", value);
      else a.removeAttribute("aria-current");
    });
  }, [activeHref]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const first = menuRef.current?.querySelector<HTMLAnchorElement>("#mobile-nav a");
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header data-nav-active={activeHref}>
      <Navbar className="top-0">
        <NavBody>
          <Link
            href="/"
            aria-label="Phylax — home"
            className="group flex items-center gap-2.5 pl-1"
          >
            <span aria-hidden className="brand-rule" />
            <span className="font-display text-title leading-none tracking-[-0.03em] text-ink">
              Phylax
            </span>
            <span className="mono-label hidden translate-y-[1px] sm:inline">
              design record
            </span>
          </Link>

          <div ref={itemsRef} className="contents" data-nav-items>
            <NavItems items={LINKS} className="gap-1 space-x-0 lg:space-x-0" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/status"
              className="mono-label hidden rounded-full px-3 py-2 hover:text-guard focus-visible:text-guard md:block"
            >
              status
            </Link>
            <NavbarButton
              as={Link}
              href={onConsole ? "/console" : "/console/login"}
              variant="dark"
              className="rounded-full border border-line-strong bg-raised px-4 py-2 text-[0.8125rem] text-ink hover:border-guard/40 hover:bg-guard-deep/40 focus-visible:border-guard"
            >
              {onConsole ? "Console" : "Open console"}
            </NavbarButton>
          </div>
        </NavBody>

        <div ref={menuRef} className="contents" data-nav-mobile>
          <MobileNav>
            <MobileNavHeader>
              <Link
                href="/"
                aria-label="Phylax — home"
                className="flex items-center gap-2.5"
              >
                <span aria-hidden className="brand-rule" />
                <span className="font-display text-lead leading-none tracking-[-0.03em] text-ink">
                  Phylax
                </span>
              </Link>
              <MobileNavToggle isOpen={open} onClick={() => setOpen(!open)} />
            </MobileNavHeader>
            <MobileNavMenu
              isOpen={open}
              onClose={() => setOpen(false)}
              className="gap-0 px-5 py-4"
            >
              {LINKS.map((l) => (
                <Link
                  key={l.link}
                  href={l.link}
                  aria-current={currentValue(l.link)}
                  onClick={() => setOpen(false)}
                  className="relative w-full border-b border-line py-3 pl-4 text-copy text-muted transition-colors last:border-b-0 hover:text-ink"
                >
                  {l.name}
                </Link>
              ))}
              <NavbarButton
                as={Link}
                href={onConsole ? "/console" : "/console/login"}
                variant="dark"
                className="mt-4 w-full rounded-full border border-line-strong bg-raised py-3 text-center text-[0.8125rem] text-ink hover:border-guard/40 hover:bg-guard-deep/40 focus-visible:border-guard"
              >
                {onConsole ? "Console" : "Open console"}
              </NavbarButton>
            </MobileNavMenu>
          </MobileNav>
        </div>
      </Navbar>
    </header>
  );
}
