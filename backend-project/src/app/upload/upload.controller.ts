import { CloudinaryService } from './../cloudinary/cloudinary.service';
import {
  Controller,
  Delete,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AtGuard } from 'src/common/guards/at.guard';
import * as fs from 'fs';

@UseGuards(AtGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'public/uploads',
        filename: (req, file, cb) => {
          const fileExtension = file.originalname.split('.').pop();
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @Post('file')
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      const url = `${process.env.BASE_SERVER_URL}/uploads/${file.filename}`;

      return {
        message: 'OK',
        file_url: url,
        file_name: file.filename,
        file_size: file.size,
      };
    } catch (err) {
      throw new HttpException('Ada Kesalahan', HttpStatus.BAD_REQUEST);
    }
  }

  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: 'public/uploads',
        filename: (req, file, cb) => {
          const fileExtension = file.originalname.split('.').pop();
          cb(null, file.originalname);
        },
      }),
    }),
  )
  @Post('files')
  async uploadFileMulti(@UploadedFiles() files: Express.Multer.File[]) {
    try {
      const file_response: Array<{
        file_url: string;
        file_name: string;
        file_size: number;
      }> = [];

      files.forEach((file) => {
        const url = `${process.env.BASE_SERVER_URL}/uploads/${file.filename}`;
        file_response.push({
          file_url: url,
          file_name: file.filename,
          file_size: file.size,
        });
      });

      return {
        message: 'OK',
        file: file_response,
      };
    } catch (err) {
      throw new HttpException('Ada Kesalahan', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('file/delete/:filename')
  async DeleteFile(@Param('filename') filename: string) {
    try {
      const filePath = `public/uploads/${filename}`;
      fs.unlinkSync(filePath);
      return {
        message: 'File Berhasil di Hapus',
      };
    } catch (err) {
      throw new HttpException('File not Found', HttpStatus.NOT_FOUND);
    }
  }

  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: 'public/videos',
        filename: (req, file, cb) => {
          const fileExtension = file.originalname.split('.').pop();
          cb(null, `${new Date().getTime()}.${fileExtension}`);
        },
      }),
    }),
  )
  @Post('video')
  async uploadVideo(@UploadedFile() video: Express.Multer.File) {
    try {
      const url = `${process.env.BASE_SERVER_URL}/videos/${video.filename}`;

      return {
        message: 'OK',
        video_url: url,
        video_name: video.filename,
        video_size: video.size,
      };
    } catch (err) {
      throw new HttpException('Ada Kesalahan', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('cloudinary')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cloudinaryService.uploadFile(file);
  }

  @Delete('cloudinary/:publicId')
  async deleteCloudinary(@Param('publicId') publicId: string) {
    try {
      return await this.cloudinaryService.deleteFile(publicId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal hapus file cloudinary';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
