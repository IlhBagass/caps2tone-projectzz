"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-sky-600 text-white"
          : "text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}
