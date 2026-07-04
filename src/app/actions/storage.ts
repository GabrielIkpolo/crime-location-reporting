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
  
  // Security Constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 
    'video/mp4', 'video/quicktime', 'video/webm'
  ];

  for (const file of files) {
    // 1. Size Validation
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds the 10MB limit.`);
    }

    // 2. MIME Type Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File ${file.name} has an invalid type. Only images and videos are allowed.`);
    }

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
