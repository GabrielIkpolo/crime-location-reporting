import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { writeFile } from 'fs/promises';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResponse {
  url: string;
  publicId?: string;
}

export async function uploadMedia(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<UploadResponse> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Local Storage Implementation
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(process.cwd(), 'public/uploads', uniqueFileName);
    
    await writeFile(filePath, fileBuffer);
    
    return {
      url: `/uploads/${uniqueFileName}`,
    };
  } else {
    // Cloudinary Implementation
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Supports image and video
          folder: 'crime_reports',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result!.secure_url,
            publicId: result!.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }
}

export async function deleteMedia(url: string): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    if (url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', url);
      await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
    }
  } else {
    // Extract publicId from Cloudinary URL
    // Format: https://res.cloudinary.com/cloudname/image/upload/v1234567/folder/publicId.jpg
    const parts = url.split('/');
    const fileNameWithExt = parts.pop();
    const publicId = fileNameWithExt?.split('.').slice(0, -1).join('.') + '/' + 
                     parts[parts.length - 2]; 
    // This is a simplified extraction; in production we'd store publicId in DB
    
    await cloudinary.uploader.destroy(publicId).catch(() => {});
  }
}
