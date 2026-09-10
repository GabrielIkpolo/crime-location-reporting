import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthSession } from "@/lib/auth-helper";
import { uploadMedia } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST /api/uploads
 * Multipart file upload endpoint for the Flutter mobile app (evidence: photos/videos/audio).
 *
 * Request: multipart/form-data with a single "file" field.
 * Response: { url, publicId? } — `url` is relative in dev (/uploads/...) or absolute (Cloudinary) in prod.
 *
 * Security:
 * - Requires authentication (cookie session OR Bearer token via getAuthSession).
 * - MIME allowlist for images/videos/audio only.
 * - 25MB max file size (also enforced in proxy.ts for this route).
 * - Rate limited per user/IP.
 * - Filenames are sanitized and prefixed with a random id to prevent path traversal / collisions.
 */

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (videos)

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
};

export async function POST(req: NextRequest) {
  try {
    // Authenticate (supports both cookie and Bearer token)
    const session = await getAuthSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit uploads per user
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || session.user.id;
    const rateLimit = await checkRateLimit(`upload:${session.user.id}:${ip}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000, // 20 uploads/hour per user
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided. Use the 'file' field." }, { status: 400 });
    }

    // In Node runtime, multipart files arrive as File (Blob) instances
    const blob = file as unknown as Blob;
    if (!(blob instanceof Blob)) {
      return NextResponse.json({ error: "Invalid file payload." }, { status: 400 });
    }

    if (blob.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (blob.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const mimeType = blob.type || "";
    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return NextResponse.json(
        { error: `File type not allowed. Accepted types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}` },
        { status: 415 }
      );
    }

    // Sanitize original name (keep base name + extension only) and prefix with random id
    const rawName = String(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    void rawName; // We always use a generated name to avoid collisions/traversal
    const safeFileName = `${crypto.randomBytes(12).toString("hex")}${extension}`;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await uploadMedia(buffer, safeFileName);

    return NextResponse.json({ url: result.url, publicId: result.publicId ?? null }, { status: 201 });
  } catch (error) {
    console.error("[Uploads] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}

// GET — capability probe (public, no data exposed). Lets clients check limits before uploading.
export async function GET() {
  return NextResponse.json({ ok: true, maxFileSizeMb: MAX_FILE_SIZE / (1024 * 1024), acceptedTypes: Object.keys(ALLOWED_MIME_TYPES) });
}
