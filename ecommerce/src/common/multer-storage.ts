import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 مگابایت

/**
 * تنظیمات Multer برای آپلود عکس محصولات/دسته‌بندی‌ها روی دیسک سرور.
 * فایل‌ها در ./uploads/<subfolder>/ ذخیره می‌شوند و از طریق
 * app.useStaticAssets در main.ts با آدرس /uploads/... در دسترس‌اند.
 */
export function imageUploadOptions(subfolder: 'products' | 'categories') {
  const uploadDir = `./uploads/${subfolder}`;

  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        // اگر پوشه وجود نداشته باشد، همین‌جا ساخته می‌شود
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (
      req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
          new BadRequestException(
            'فقط فایل‌های تصویری (jpg, png, webp, gif) مجاز هستند',
          ),
          false,
        );
      }
      cb(null, true);
    },
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  };
}
