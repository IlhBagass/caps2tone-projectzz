// Unggah foto validasi ke Cloudinary. Backend hanya menandatangani unggahan (rahasia API tetap di server);
// file dikirim langsung dari browser ke Cloudinary, lalu URL hasilnya dikirim sebagai photoUrl saat menyimpan scan.
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api";

interface SignedUpload {
  upload_url: string;
  api_key: string;
  signature: string;
  params: Record<string, string | number>;
}

export async function uploadPhoto(file: Blob, scheduleId: number): Promise<string> {
  // raw: parameter tanda tangan harus persis (tidak boleh diubah ke camelCase), jadi body dan respons memakai snake_case.
  const sign = await api.post<SignedUpload>("/api/uploads/sign", { schedule_id: scheduleId }, { raw: true });

  const form = new FormData();
  for (const [key, value] of Object.entries(sign.params)) form.append(key, String(value));
  form.append("api_key", sign.api_key);
  form.append("signature", sign.signature);
  form.append("file", file, "foto-validasi.jpg");

  let res: Response;
  try {
    res = await fetch(sign.upload_url, { method: "POST", body: form });
  } catch {
    throw new ApiError(0, "UPLOAD_FAILED", "Foto tidak dapat diunggah. Periksa koneksi lalu coba lagi.");
  }
  const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.secure_url) {
    throw new ApiError(res.status, "UPLOAD_FAILED", body?.error?.message ?? "Foto ditolak oleh layanan penyimpanan.");
  }
  return body.secure_url;
}
