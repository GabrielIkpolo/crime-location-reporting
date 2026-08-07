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
  const uploadedUrls: string[] = [];

  const isDev = process.env.NODE_ENV === 'development';
  
  // Security Constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/x-wav',
    'application/pdf'
  ] as const;

  // Check Cloudinary Config in Production
  if (!isDev && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
    console.error("[STORAGE_ACTION] Cloudinary environment variables are missing in production!");
    throw new Error("Cloudinary configuration error. Please contact the administrator.");
  }

  for (const file of files) {
    // 1. Size Validation
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds the 10MB limit.`);
    }

    // 2. MIME Type Validation
    const normalizedType = file.type.toLowerCase().trim();
    if (!ALLOWED_TYPES.includes(normalizedType as typeof ALLOWED_TYPES[number])) {
      throw new Error(
        `File ${file.name} has an invalid type. Allowed: images (jpg, png, webp), videos (mp4, mov, webm), audio (mp3, wav), and PDFs.`
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (isDev) {
      const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        // Ensure directory exists
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, uniqueFileName);
        await writeFile(filePath, buffer);
        uploadedUrls.push(`/uploads/${uniqueFileName}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[STORAGE_ACTION] Local upload failed:", err);
        throw new Error(`Local file storage failed: ${errorMessage}`);
      }
    } else {
      try {
        const result = await new Promise<unknown>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'crime_reports' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });

        const uploadRes = result as { secure_url: string };
        if (!uploadRes.secure_url) {
          throw new Error("Cloudinary upload succeeded but no secure URL was returned.");
        }
        uploadedUrls.push(uploadRes.secure_url);
      } catch (err) {
        console.error("[STORAGE_ACTION] Cloudinary upload failed:", err);
        // Provide a more helpful error message if it's a Cloudinary error
        const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : "Unknown Cloudinary error");
        throw new Error(`Media upload failed: ${errorMessage}`);
      }
    }
  }

  return { urls: uploadedUrls };
}
