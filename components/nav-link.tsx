"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact = false,
  icon,
  badge,
  children,
}: {
  href: string;
  exact?: boolean;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-sky-600 text-white shadow-sm"
          : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums ${
            active ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
