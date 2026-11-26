// Sesi pengguna dari backend (cookie httpOnly caps2tone_session, diteruskan oleh api-server).
// Pengecekan role dilakukan di proxy.ts dan diulang di setiap halaman lewat fungsi require*.
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverGet } from "@/lib/api-server";
import type { Area, Role } from "@/lib/types";

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  role: Role;
  areas: Area[];
}

interface MeResponse {
  user: { id: number; name: string; username: string; role: Role };
  areas: Area[];
}

/** Pengguna yang sedang masuk, atau null bila belum masuk atau sesi sudah habis. Dipanggil sekali per permintaan. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const { data } = await serverGet<MeResponse>("/api/auth/me");
    return { id: data.user.id, name: data.user.name, username: data.user.username, role: data.user.role, areas: data.areas };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/teknisi");
  return user;
}

export async function requireTechnician(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "teknisi") redirect("/admin");
  return user;
}
