/**
 * GikpsMail HTTP Transporter — Drop-in replacement for Nodemailer SMTP
 * 
 * Sends emails via HTTP to your deployed GikpsMail service on Render.
 * This is a nodemailer-compatible transporter that uses HTTP/HTTPS instead of SMTP.
 * 
 * For attachments in production: uploads files to Cloudinary first, then sends
 * the CDN URL reference via GikpsMail API for scalable storage.
 * 
 * Environment Variables:
 * - GIKPSMAIL_API_URL: URL of your GikpsMail service (e.g., https://gikps-email-service.onrender.com)
 * - GIKPSMAIL_API_KEY: Your master API key for authentication
 * - EMAIL_FROM_NAME: Display name for sent emails (default: "CrimeReport System")
 * - EMAIL_FROM_ADDRESS: Default from address (default: "noreply@crimereport.ng")
 * - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: For production attachments
 */

import axios, { AxiosInstance } from "axios";
import { v2 as cloudinary } from "cloudinary";

// ============================================================================
// Configuration
// ============================================================================

const API_URL = (process.env.GIKPSMAIL_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const API_KEY = process.env.GIKPSMAIL_API_KEY || "";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "CrimeReport System";
const DEFAULT_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "noreply@crimereport.ng";

// Cloudinary config (for production attachment uploads)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

let cloudinaryConfigured = false;
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  try {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
  } catch (err) {
    console.error("[GikpsMail] Cloudinary configuration failed:", err);
  }
}

// Validate required config in production
if (process.env.NODE_ENV === "production" && !API_KEY) {
  console.warn(
    "[GikpsMail] WARNING: GIKPSMAIL_API_KEY is not set. Email sending will fail in production."
  );
}

/**
 * Parsed from address format: "Name <email@example.com>" or just email
 */
interface FromAddress {
  name: string;
  address: string;
}

/**
 * Attachment interface matching GikpsMail API expectations
 */
export interface MailAttachment {
  filename: string;
  content: string | Buffer; // base64 encoded string or raw buffer
  mimeType?: string;
}

/**
 * Recipient type — supports plain strings or objects with address/name/email
 */
type Recipient = string | { address: string; name?: string; email?: string };

/**
 * Nodemailer-compatible mail options
 */
export interface MailOptions {
  from?: string | FromAddress;
  to: Recipient | Recipient[];
  cc?: Recipient | Recipient[];
  bcc?: Recipient | Recipient[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

/**
 * Send result matching nodemailer's response format
 */
export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  envelope?: { from: string; to: string[] };
  message?: string;
}

// ============================================================================
// Cloudinary Upload Helper
// ============================================================================

/**
 * Upload a file buffer to Cloudinary and return the CDN URL.
 * Used for email attachments in production environments.
 */
async function uploadToCloudinary(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; publicId: string }> {
  if (!cloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, API_KEY, and API_SECRET.");
  }

  return new Promise((resolve, reject) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const publicId = `crimereport/attachments/${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "crimereport/email_attachments",
        public_id: publicId,
        format: ext === "svg" ? undefined : (ext as any),
        transformation: [
          // Optimize image uploads
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        if (!result?.secure_url) return reject(new Error("Cloudinary returned no URL"));

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    ).end(buffer);
  });
}

// ============================================================================
// HTTP Transporter Class
// ============================================================================

class GikpsMailTransporter {
  private httpClient: AxiosInstance;
  private fromName: string;
  private fromAddress: string;
  private timeout: number;

  constructor(config: { apiUrl?: string; apiKey?: string; fromName?: string; fromAddress?: string; timeout?: number } = {}) {
    const baseUrl = (config.apiUrl || API_URL).replace(/\/+$/, "");
    
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 60000, // 60 second timeout (Render free tier cold starts)
      headers: {
        "X-API-Key": config.apiKey || API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    this.fromName = config.fromName || DEFAULT_FROM_NAME;
    this.fromAddress = config.fromAddress || DEFAULT_FROM_ADDRESS;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Parse a from field into name and address components.
   * Supports formats: "email@example.com", "Name <email@example.com>", or { name, address } object.
   */
  private parseFrom(from?: string | FromAddress): { name: string; address: string } {
    if (!from) {
      return { name: this.fromName, address: this.fromAddress };
    }

    // Check if it's a string (not an object with 'address' property)
    if (typeof from === "string") {
      return this.parseFromString(from);
    }

    // It's a FromAddress object
    return {
      name: from.name || this.fromName,
      address: from.address || this.fromAddress,
    };
  }

  private parseFromString(fromStr: string): FromAddress {
    // Try to match "Name <email@example.com>" format
    const match = fromStr.match(/(?:"?([^"]*)"?\s)?<?([^\s>]+@[^\s>]+)>?/);
    if (match) {
      return {
        name: match[1] || this.fromName,
        address: match[2] || this.fromAddress,
      };
    }
    // Plain email address
    return { name: this.fromName, address: fromStr };
  }

  /**
   * Normalize recipients to an array of email addresses.
   */
  private normalizeRecipients(recipients?: Recipient | Recipient[]): string[] {
    if (!recipients) return [];

    const arr = Array.isArray(recipients) ? recipients : [recipients];
    return arr.map((r): string => {
      if (typeof r === "string") return r;
      return r.address || r.email || "";
    }).filter(Boolean);
  }

  /**
   * Process attachments: in production, upload to Cloudinary first.
   */
  private async processAttachments(attachments?: MailAttachment[]): Promise<Record<string, unknown>[]> {
    if (!attachments || attachments.length === 0) return [];

    const processed = await Promise.all(
      attachments.map(async (att) => {
        let content: string;
        let mimeType = att.mimeType || "application/octet-stream";

        // Determine if we should use Cloudinary (production with config)
        const useCloudinary = cloudinaryConfigured && process.env.NODE_ENV !== "development";

        if (useCloudinary) {
          // Convert to buffer and upload to Cloudinary
          let buffer: Buffer;
          if (typeof att.content === "string") {
            // Check if it's already base64 or raw text
            try {
              buffer = Buffer.from(att.content, "base64");
            } catch {
              buffer = Buffer.from(att.content);
            }
          } else {
            buffer = att.content as Buffer;
          }

          const cloudResult = await uploadToCloudinary(buffer, att.filename || "attachment");
          
          // Extract MIME type from URL for Cloudinary uploads
          if (cloudResult.url.includes("/image/upload/")) mimeType = "image/*";
          else if (cloudResult.url.includes("/video/upload/")) mimeType = "video/*";

          return {
            filename: att.filename || "attachment",
            url: cloudResult.url,
            mimeType,
            fromCloudinary: true,
          };
        } else {
          // Development mode: send base64 directly
          if (typeof att.content === "string") {
            content = att.content;
          } else {
            content = (att.content as Buffer).toString("base64");
          }

          return {
            filename: att.filename || "attachment",
            content,
            mimeType,
            fromCloudinary: false,
          };
        }
      })
    );

    return processed;
  }

  /**
   * Send an email — nodemailer-compatible sendMail method.
   */
  async sendMail(mailOptions: MailOptions): Promise<SendResult> {
    const { to, subject, text = "", html = text || "", attachments } = mailOptions;

    // Validate required fields
    if (!to) {
      throw new Error("Recipient (to) is required");
    }
    if (!subject) {
      throw new Error("Subject is required");
    }

    const fromParsed = this.parseFrom(mailOptions.from);
    const toAddresses = this.normalizeRecipients(to);

    if (toAddresses.length === 0) {
      throw new Error("No valid recipient addresses provided");
    }

    // Process attachments (may upload to Cloudinary in production)
    const processedAttachments = await this.processAttachments(attachments);

    // Build payload for GikpsMail HTTP API (send-json endpoint)
    const payload: Record<string, unknown> = {
      to: toAddresses[0], // Primary recipient
      subject,
      text: text || "",
      html: html || text || "",
      fromName: fromParsed.name,
      fromEmail: fromParsed.address,
    };

    // Add CC if provided
    const ccList = this.normalizeRecipients(mailOptions.cc);
    if (ccList.length > 0) {
      payload.cc = ccList;
    }

    // Add BCC if provided
    const bccList = this.normalizeRecipients(mailOptions.bcc);
    if (bccList.length > 0) {
      payload.bcc = bccList;
    }

    // Add attachments if present
    if (processedAttachments.length > 0) {
      payload.attachments = processedAttachments.map((att) => ({
        filename: att.filename || "attachment",
        content: att.content || "",
        mimeType: att.mimeType || "application/octet-stream",
        url: att.url || undefined,
        fromCloudinary: att.fromCloudinary || false,
      }));
    }

    try {
      const response = await this.httpClient.post("/api/mail/send-json", payload);

      const responseData = response.data as any;
      
      // Extract message ID from various possible response formats
      const messageId = 
        responseData?.messageId || 
        responseData?.data?.email?.id || 
        `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return {
        messageId: messageId,
        accepted: toAddresses,
        rejected: [],
        envelope: {
          from: fromParsed.address,
          to: toAddresses,
        },
        message: "Email sent successfully",
      };
    } catch (error) {
      // Provide detailed error information for debugging
      let errorMessage = "GikpsMail Transport Error";

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const serverError = error.response?.data?.error || error.response?.data?.message;

        if (status === 401 || status === 403) {
          errorMessage += ": Authentication failed. Check your GIKPSMAIL_API_KEY.";
        } else if (status === 404) {
          errorMessage += `: ${serverError || "Recipient not found in GikpsMail system"}`;
        } else if (status && status >= 500) {
          errorMessage += ": Server error. Please try again later.";
        } else if (status === 429) {
          errorMessage += ": Rate limit exceeded. Try again later.";
        } else {
          errorMessage += `: ${serverError || error.message}`;
        }

        console.error(`[GikpsMail] HTTP ${status}: ${errorMessage}`);
      } else if (error instanceof Error) {
        // Check for Cloudinary errors
        if (error.message.includes("Cloudinary")) {
          errorMessage += `: ${error.message}. Emails will still be sent without attachments.`;
          console.warn("[GikpsMail] Cloudinary error, continuing without attachment:", error.message);
          
          // Retry without attachments
          try {
            const retryPayload = { ...payload };
            delete retryPayload.attachments;
            
            const response = await this.httpClient.post("/api/mail/send-json", retryPayload);
            const responseData = response.data as any;
            const messageId = 
              responseData?.messageId || 
              responseData?.data?.email?.id || 
              `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            return {
              messageId: messageId,
              accepted: toAddresses,
              rejected: [],
              envelope: {
                from: fromParsed.address,
                to: toAddresses,
              },
              message: "Email sent successfully (without attachments due to Cloudinary error)",
            };
          } catch (retryError) {
            console.error("[GikpsMail] Retry without attachments also failed:", retryError);
          }
        } else {
          errorMessage += `: ${error.message}`;
          console.error("[GikpsMail] Unexpected error:", error);
        }
      }

      const nodemailerError = new Error(errorMessage);
      (nodemailerError as any).code = axios.isAxiosError(error) 
        ? `E${error.response?.status || 'NETWORK'}` 
        : "ENETWORK";
      (nodemailerError as any).detail = error instanceof Error ? error.message : String(error);

      throw nodemailerError;
    }
  }

  /**
   * Verify transporter configuration — nodemailer-compatible verify method.
   */
  async verify(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/api/auth/verify");
      return response.status === 200 && response.data?.status === "success";
    } catch (error) {
      console.error("[GikpsMail] Transport verification failed:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Close transporter (no-op for HTTP transport).
   */
  close(): Promise<void> {
    return Promise.resolve();
  }
}

// ============================================================================
// Factory Function — mimics nodemailer.createTransport()
// ============================================================================

/**
 * Create a GikpsMail transporter instance.
 * 
 * Usage:
 *   const transporter = createGikpsMailTransport();
 *   await transporter.sendMail({ to, subject, html });
 */
export function createGikpsMailTransport(
  config?: { apiUrl?: string; apiKey?: string; fromName?: string; fromAddress?: string; timeout?: number }
): GikpsMailTransporter {
  return new GikpsMailTransporter(config);
}

// ============================================================================
// Default Transporter Instance (uses env vars)
// ============================================================================

const defaultTransporter = createGikpsMailTransport();

export default defaultTransporter;
