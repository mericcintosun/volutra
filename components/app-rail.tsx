"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Gauge, List, PenLine } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/spirals", label: "Spirals", icon: List },
  { href: "/activity", label: "Dose day", icon: Clock },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/spirals") return pathname === "/spirals" || (pathname.startsWith("/spirals/") && pathname !== "/spirals/new");
  return pathname.startsWith(href);
}

/**
 * The persistent rail: mark, three sections and the one primary action. On desktop it is
 * a fixed left column; on mobile the mark sits in a sticky top strip and the sections plus
 * the action drop to a bottom bar.
 */
export function AppRail() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-40 border-b border-border bg-background md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-b-0 md:border-r print:hidden">
      <div className="flex h-14 items-center px-5 md:h-auto md:px-6 md:pt-7">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="font-display text-xl font-semibold tracking-tight">Volutra</span>
        </Link>
      </div>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-border bg-background px-2 py-2 md:static md:mt-10 md:flex-col md:items-stretch md:gap-1 md:border-t-0 md:px-4 md:py-0"
      >
        {SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className={cn("hidden sm:inline", active && "kiln-underline")}>{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </Link>
          );
        })}
        <Button asChild className="ml-auto md:ml-0 md:mt-6">
          <Link href="/spirals/new">
            <PenLine aria-hidden />
            Draw a spiral
          </Link>
        </Button>
      </nav>

      <p className="hidden px-6 text-xs leading-relaxed text-muted-foreground md:absolute md:bottom-6 md:block">
        A measurement diary to share with your neurologist. Not a diagnostic tool. Nothing leaves this browser.
      </p>
    </aside>
  );
}
