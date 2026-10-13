import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary.response';
const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const resourceType = file.mimetype?.startsWith('video/')
        ? 'video'
        : 'image';

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType },
        (error, result) => {
          if (error) return reject(error);

          // Pastikan result tidak undefined
          if (!result)
            return reject(new Error('Cloudinary upload result is undefined'));

          // Gabungkan data asli cloudinary dengan custom field kita
          // Gunakan 'as any' jika ingin memaksa atau update Interface Anda
          resolve({
            ...result,
            file_url: result.secure_url,
            file_name: `${result.public_id}.${result.format}`,
            file_size: result.bytes,
          } as CloudinaryResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image') {
    const attempt = async (rt: 'image' | 'video') =>
      cloudinary.uploader.destroy(publicId, { resource_type: rt });

    let result = await attempt(resourceType);

    // Fallback: jika gagal dengan resource_type pertama (mis. pemanggil lama
    // selalu kirim 'image' padahal file video), coba tipe satunya.
    if (result?.result !== 'ok') {
      const fallback: 'image' | 'video' =
        resourceType === 'image' ? 'video' : 'image';
      try {
        const retry = await attempt(fallback);
        if (retry?.result === 'ok') {
          result = retry;
        }
      } catch {
        // biarkan error handling di bawah yang melempar
      }
    }

    if (result.result !== 'ok') {
      throw new Error('Gagal menghapus file dari Cloudinary');
    }

    return {
      message: 'File Cloudinary berhasil dihapus',
      public_id: publicId,
    };
  }
}
