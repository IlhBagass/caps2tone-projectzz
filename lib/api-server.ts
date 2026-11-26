// Klien API untuk komponen server (server component, route handler, proxy.ts).
// Memanggil backend langsung dan meneruskan cookie sesi dari permintaan browser.
// Hanya impor dari kode server: berkas ini membaca cookies() dan BACKEND_URL.
import { cookies } from "next/headers";
import { ApiError, parseResponse, type Envelope } from "@/lib/api";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function serverGet<T>(path: string, options: { raw?: boolean } = {}): Promise<Envelope<T>> {
  const cookie = (await cookies()).toString();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, { headers: { cookie }, cache: "no-store" });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Backend tidak dapat dihubungi.");
  }
  return parseResponse<T>(res, options);
}
