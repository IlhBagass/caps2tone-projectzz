"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ServerLoader } from "@/components/server-loader";

// Demo: menampilkan animasi loading selama `duration` ms sebelum konten tampil.
// Ganti dengan state loading data sungguhan saat sudah terhubung ke database.
export function DemoLoading({
  children,
  duration = 3000,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return loading ? <ServerLoader /> : <>{children}</>;
}
