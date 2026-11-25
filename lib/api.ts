// Bagian klien API yang dipakai bersama browser dan server: kontrak respons, error,
// dan konversi nama field. Backend memakai snake_case, frontend camelCase.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

/** Bentuk respons sukses backend: { data } dan, untuk daftar, { meta }. */
export interface Envelope<T> {
  data: T;
  meta?: PageMeta;
}

/**
 * Pesan error yang ramah untuk ditampilkan. `overrides` memetakan kode error backend ke pesan khusus
 * (mis. CONFLICT = username sudah dipakai); selain itu dipakai pesan dari backend.
 */
export function errorMessage(
  error: unknown,
  overrides: Record<string, string> = {},
  fallback = "Terjadi kesalahan. Coba lagi.",
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (overrides[error.code]) return overrides[error.code];
  if (error.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
    const field = (error.details[0] as { field?: string } | undefined)?.field;
    return field ? `Isian "${field}" tidak valid.` : "Input tidak valid.";
  }
  return error.message || fallback;
}

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => convertKeys(item, convert));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [convert(k), convertKeys(v, convert)]));
}

export const camelizeKeys = <T>(value: unknown) => convertKeys(value, toCamel) as T;
export const snakeizeKeys = (value: unknown) => convertKeys(value, toSnake);

/** Query string dari objek camelCase; nilai kosong dilewati. */
export function queryString(params: Record<string, string | number | boolean | null | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(toSnake(key), String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** Membaca respons backend; melempar ApiError untuk { error: { code, message, details } }. */
export async function parseResponse<T>(res: Response, options: { raw?: boolean } = {}): Promise<Envelope<T>> {
  if (res.status === 204) return { data: undefined as T };
  const body = (await res.json().catch(() => null)) as {
    data?: unknown;
    meta?: PageMeta;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.error?.message ?? `Permintaan gagal (${res.status}).`,
      body?.error?.details,
    );
  }
  const data = options.raw ? body?.data : camelizeKeys(body?.data);
  return { data: data as T, meta: body?.meta };
}
