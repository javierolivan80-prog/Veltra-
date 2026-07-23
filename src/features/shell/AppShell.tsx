"use client";

import { Cpu, Home, List, TrendingUp, User, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/design-system/components/Logo";
import { useProfile } from "@/features/profile/hooks";
import { isOnboarded } from "@/features/profile/repo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/routines", label: "Rutinas", icon: List },
  { href: "/progress", label: "Progreso", icon: TrendingUp },
  { href: "/food", label: "Food", icon: UtensilsCrossed },
  { href: "/coach", label: "Coach", icon: Cpu },
  { href: "/profile", label: "Perfil", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Direct navigation (bookmark, refresh, deep link) can land here before
  // onboarding ever ran — guard every authenticated route the same way the
  // root gate does.
  const { data: profile, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && !isOnboarded(profile)) router.replace("/onboarding");
  }, [isLoading, profile, router]);

  if (isLoading || !isOnboarded(profile)) return null;

  return (
    <div className="min-h-screen bg-bg md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-line-subtle px-5 py-7">
        <div className="mb-10 px-2">
          <Logo size="sm" />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                <Icon size={18} className={active ? "text-progress" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <main className="max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-28 md:pb-14">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-50 bg-surface-raised/95 backdrop-blur border border-line-subtle rounded-[26px] shadow-2xl shadow-black/40 px-1 py-2 flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-2xl">
              <Icon size={19} className={active ? "text-progress" : "text-ink-faint"} />
              <span className={cn("text-[9px] font-semibold max-w-full truncate", active ? "text-progress" : "text-ink-faint")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
