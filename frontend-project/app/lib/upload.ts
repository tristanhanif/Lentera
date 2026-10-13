import { api } from "@/app/lib/axios";

export const uploadToCloudinary = async (
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<{ secure_url?: string; file_url?: string }>(
    "/upload/cloudinary",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      ...(onProgress
        ? {
            onUploadProgress: (e: { loaded: number; total?: number }) => {
              if (e.total) {
                onProgress(Math.round((e.loaded / e.total) * 100));
              }
            },
          }
        : {}),
    },
  );

  const url = res.data?.secure_url || res.data?.file_url;
  if (!url) throw new Error("Gagal mendapatkan URL dari Cloudinary");
  return url;
};

// Upload dokumen chat (pdf/doc/xls/ppt/txt) ke /upload/file (disk storage).
// Mengembalikan url + nama + ukuran untuk disimpan ke pesan chat.
export const uploadChatDocument = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; name: string; size: number }> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<{
    file_url?: string;
    file_name?: string;
    file_size?: number;
  }>("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    ...(onProgress
      ? {
          onUploadProgress: (e: { loaded: number; total?: number }) => {
            if (e.total) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        }
      : {}),
  });

  const url = res.data?.file_url;
  if (!url) throw new Error("Gagal mengupload dokumen");
  return {
    url,
    name: res.data?.file_name || file.name,
    size: res.data?.file_size ?? file.size,
  };
};