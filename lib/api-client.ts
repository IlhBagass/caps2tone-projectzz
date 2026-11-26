// Klien API untuk komponen client (browser). Memanggil /api/* pada origin yang sama;
// next.config.ts meneruskannya ke backend sehingga cookie sesi menjadi first-party.
// Mutasi memerlukan header X-CSRF-Token, yang disimpan di memori dan dipulihkan lewat /api/auth/me.
import { ApiError, parseResponse, snakeizeKeys, type Envelope } from "@/lib/api";

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Jangan ubah nama field (mis. parameter tanda tangan Cloudinary harus persis). */
  raw?: boolean;
  signal?: AbortSignal;
}

const UNSAFE = new Set(["POST", "PATCH", "PUT", "DELETE"]);
// Endpoint publik di backend: tanpa sesi dan tanpa token CSRF.
const PUBLIC = new Set(["/api/auth/login", "/api/auth/register"]);
// Endpoint yang boleh menjawab 401 tanpa berarti sesi habis (salah password, atau sudah keluar).
const NO_REDIRECT = new Set([...PUBLIC, "/api/auth/logout"]);

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { data?: { csrf_token?: string } } | null;
  csrfToken = body?.data?.csrf_token ?? null;
  return csrfToken;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  // FormData (unggah file) dikirim apa adanya; browser yang mengisi Content-Type beserta batasnya.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (UNSAFE.has(method) && !PUBLIC.has(path)) {
    const token = await ensureCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.raw ? options.body : snakeizeKeys(options.body)),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
  }

  // Sesi habis atau dicabut: kembali ke halaman masuk.
  if (res.status === 401 && !NO_REDIRECT.has(path) && typeof window !== "undefined") {
    csrfToken = null;
    // Navigasi penuh (bukan router) agar semua state di memori browser ikut hilang.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- navigasi penuh disengaja: membersihkan state memori
    window.location.href = "/login";
  }
  return parseResponse<T>(res, { raw: options.raw });
}

/** Unduh berkas dari backend (mis. ekspor Excel). Melempar ApiError bila backend menolak. */
export async function download(path: string): Promise<{ blob: Blob; filename: string | null }> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
  }
  if (!res.ok) await parseResponse(res); // melempar ApiError dengan pesan dari backend
  const filename = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? null;
  return { blob: await res.blob(), filename };
}

export const api = {
  get: async <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) => (await request<T>(path, options)).data,
  /** Seperti get, tetapi mengembalikan { data, meta } untuk daftar berhalaman. */
  page: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) => request<T[]>(path, options),
  post: async <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    (await request<T>(path, { ...options, method: "POST", body })).data,
  /** Unggah satu atau beberapa file (multipart/form-data). */
  upload: async <T>(path: string, form: FormData) => (await request<T>(path, { method: "POST", body: form })).data,
  patch: async <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    (await request<T>(path, { ...options, method: "PATCH", body })).data,
  delete: async <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    (await request<T>(path, { ...options, method: "DELETE" })).data,
};
