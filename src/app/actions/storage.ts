"use server";

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { writeFile } from 'fs/promises';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadMediaAction(formData: FormData) {
  const files = formData.getAll('files') as File[];
  const uploadedUrls = [];

  const isDev = process.env.NODE_ENV === 'development';

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (isDev) {
      const uniqueFileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(process.cwd(), 'public/uploads', uniqueFileName);
      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${uniqueFileName}`);
    } else {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'crime_reports' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
      uploadedUrls.push((result as any).secure_url);
    }
  }

  return { urls: uploadedUrls };
}
