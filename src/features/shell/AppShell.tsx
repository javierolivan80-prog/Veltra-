"use client";

import { Brain, Dumbbell, Home, ShieldAlert, Target, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/design-system/components/Logo";
import { useActiveContract } from "@/features/contract/hooks";
import { useProfile } from "@/features/profile/hooks";
import { isOnboarded } from "@/features/profile/repo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Hoy", icon: Home, activeColor: "text-progress" },
  { href: "/body", label: "Cuerpo", icon: Dumbbell, activeColor: "text-info" },
  { href: "/mind", label: "Mente", icon: Brain, activeColor: "text-progress" },
  { href: "/recovery", label: "Recuperación", icon: ShieldAlert, activeColor: "text-addiction" },
  { href: "/life", label: "Vida", icon: Target, activeColor: "text-record" },
];

/** Module routes that belong to each category tab, so it stays highlighted
 *  when you're two levels deep (e.g. /sleep highlights "Cuerpo"). */
const CATEGORY_CHILDREN: Record<string, string[]> = {
  "/body": ["/routines", "/progress", "/history", "/workout", "/exercises", "/sleep", "/food", "/weight"],
  "/mind": ["/habits", "/meditation", "/journal", "/focus"],
  "/recovery": ["/addictions", "/screen-time"],
  "/life": ["/finances", "/goals"],
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return (CATEGORY_CHILDREN[href] ?? []).some((child) => pathname === child || pathname.startsWith(`${child}/`));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Direct navigation (bookmark, refresh, deep link) can land here before
  // onboarding ever ran — guard every authenticated route the same way the
  // root gate does.
  const { data: profile, isLoading } = useProfile();
  // Y sin contrato firmado tampoco se entra: el plan del día no existe hasta
  // que hay compromisos que lo llenen.
  const { data: contract, isLoading: contractLoading } = useActiveContract();
  const profileReady = !isLoading && isOnboarded(profile);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded(profile)) {
      router.replace("/onboarding");
      return;
    }
    if (!contractLoading && !contract) router.replace("/onboarding/contract");
  }, [isLoading, profile, contractLoading, contract, router]);

  if (!profileReady || contractLoading || !contract) return null;

  return (
    <div className="min-h-screen bg-bg md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-line-subtle px-5 py-7">
        <div className="mb-10 px-2">
          <Logo size="sm" />
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors",
                  active ? "bg-surface-raised text-ink" : "text-ink-dim hover:text-ink hover:bg-surface"
                )}
              >
                <Icon size={18} className={active ? item.activeColor : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors",
            isActive(pathname, "/profile") ? "bg-surface-raised text-ink" : "text-ink-dim hover:text-ink hover:bg-surface"
          )}
        >
          <User size={18} />
          Perfil
        </Link>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <main className="max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-28 md:pb-14">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-50 bg-[#101010]/95 backdrop-blur-[16px] border border-line-subtle rounded-lg shadow-2xl shadow-black/40 px-1.5 py-2.5 flex">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 py-1 rounded-2xl">
              <Icon size={20} className={active ? item.activeColor : "text-ink-faint"} />
              <span className={cn("text-[10px] font-semibold max-w-full truncate", active ? item.activeColor : "text-ink-faint")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
