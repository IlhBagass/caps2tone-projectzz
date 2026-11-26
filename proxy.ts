// Proteksi halaman per role (di Next 16 berkas ini menggantikan middleware.ts).
// Sesi diperiksa ke backend lewat cookie yang sama; role diulang lagi di setiap halaman (require*).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const SESSION_COOKIE = "caps2tone_session";

async function readRole(request: NextRequest): Promise<"admin" | "teknisi" | null> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes(`${SESSION_COOKIE}=`)) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, { headers: { cookie }, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { user?: { role?: string } } };
    const role = body.data?.user?.role;
    return role === "admin" || role === "teknisi" ? role : null;
  } catch {
    // Backend tidak terjangkau: perlakukan sebagai belum masuk, bukan membuka halaman.
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname.startsWith("/admin")) {
    if (!role) return redirect("/login");
    if (role !== "admin") return redirect("/teknisi");
  } else if (pathname.startsWith("/teknisi")) {
    if (!role) return redirect("/login");
    if (role !== "teknisi") return redirect("/admin");
  } else if (role) {
    // /login dan /daftar tidak perlu dibuka lagi oleh yang sudah masuk.
    return redirect(role === "admin" ? "/admin" : "/teknisi");
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teknisi/:path*", "/login", "/daftar"],
};
