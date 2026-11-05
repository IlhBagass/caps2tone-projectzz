// STUB sementara: belum ada autentikasi (library auth masih [TBD]).
// Ganti isi fungsi ini dengan pembacaan sesi asli (cookie httpOnly / Auth.js).
// Pemanggil tidak perlu diubah: setiap halaman dan route handler admin
// tetap memanggil requireAdmin(), selain pengecekan di proxy.ts.
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";

export interface SessionUser {
  name: string;
  role: Role;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return { name: "Administrator", role: "admin" };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/teknisi");
  return user;
}
