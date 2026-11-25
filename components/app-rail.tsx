"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Gauge, List, PenLine, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/spirals", label: "Spirals", icon: List },
  { href: "/activity", label: "Dose day", icon: Clock },
];

/** The overview's three sections, in page order (ids set in app/page.tsx). */
const ANCHORS = [
  { id: "today-coil", label: "Coil" },
  { id: "verdict", label: "What today says" },
  { id: "method", label: "How it is measured" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/spirals") return pathname === "/spirals" || (pathname.startsWith("/spirals/") && pathname !== "/spirals/new");
  return pathname.startsWith(href);
}

/** The id of the first overview section that is on screen, watched with an IntersectionObserver. */
function useSectionInView(enabled: boolean): string {
  const [current, setCurrent] = useState(ANCHORS[0].id);
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;
    const elements = ANCHORS.map((a) => document.getElementById(a.id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        const first = ANCHORS.find((a) => (ratios.get(a.id) ?? 0) > 0);
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-15% 0px -40% 0px", threshold: [0, 0.2, 0.5, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);
  return current;
}

function AnchorLink({ id, label, inView }: { id: string; label: string; inView: boolean }) {
  const className = "flex min-h-9 items-center rounded-lg px-3 text-sm transition-colors hover:text-foreground";
  return inView ? (
    <a href={`#${id}`} aria-current="location" className={cn(className, "text-foreground")}>
      <span className="kiln-underline">{label}</span>
    </a>
  ) : (
    <a href={`#${id}`} className={cn(className, "text-muted-foreground")}>
      {label}
    </a>
  );
}

function RailSection({ href, label, icon: Icon, pathname, inView }: { href: string; label: string; icon: LucideIcon; pathname: string; inView: string }) {
  const active = isActive(pathname, href);
  return (
    <>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors md:justify-start",
          active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className={cn("hidden sm:inline", active && "kiln-underline")}>{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </Link>
      {href === "/" && active && (
        <ul aria-label="On this page" className="hidden md:mb-1 md:ml-6 md:block md:border-l md:border-border md:pl-1">
          {ANCHORS.map((a) => (
            <li key={a.id}>
              <AnchorLink id={a.id} label={a.label} inView={inView === a.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The persistent rail: mark, three sections and the one primary action. On desktop it is
 * a fixed left column and, on the overview, lists the page's three sections with the one
 * in view marked; on mobile the mark sits in a sticky top strip and the sections plus the
 * action drop to a bottom bar.
 */
export function AppRail() {
  const pathname = usePathname();
  const inView = useSectionInView(pathname === "/");
  return (
    <aside className="sticky top-0 z-40 border-b border-border bg-background md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-b-0 md:border-r print:hidden">
      <header className="flex h-14 items-center px-5 md:h-auto md:px-6 md:pt-7">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="font-display text-xl font-semibold tracking-tight">Volutra</span>
        </Link>
      </header>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-border bg-background px-2 py-2 md:static md:mt-10 md:flex-col md:items-stretch md:gap-1 md:border-t-0 md:px-4 md:py-0"
      >
        {SECTIONS.map((section) => (
          <RailSection key={section.href} {...section} pathname={pathname} inView={inView} />
        ))}
        <Button asChild className="ml-auto md:ml-0 md:mt-6">
          <Link href="/spirals/new">
            <PenLine aria-hidden />
            Draw a spiral
          </Link>
        </Button>
      </nav>

      <p className="hidden px-6 text-xs leading-relaxed text-muted-foreground md:absolute md:bottom-6 md:block">
        A measurement diary to share with your neurologist. Not a diagnostic tool. Nothing leaves this browser.{" "}
        <a
          href="https://github.com/mericcintosun/volutra"
          target="_blank"
          rel="noopener noreferrer"
          className="kiln-underline text-foreground"
        >
          Source on GitHub
        </a>
      </p>
    </aside>
  );
}
