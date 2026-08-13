/**
 * GikpsMail HTTP Transporter — Drop-in replacement for Nodemailer SMTP
 * 
 * Sends emails via HTTP to your deployed GikpsMail service on Render.
 * This is a nodemailer-compatible transporter that uses HTTP/HTTPS instead of SMTP.
 * 
 * Environment Variables:
 * - GIKPSMAIL_API_URL: URL of your GikpsMail service (e.g., https://gikps-email-service.onrender.com/api)
 * - GIKPSMAIL_API_KEY: Your master API key for authentication
 * - EMAIL_FROM_NAME: Display name for sent emails (default: "CrimeReport System")
 * - EMAIL_FROM_ADDRESS: Default from address (default: "noreply@crimereport.ng")
 */

import axios, { AxiosInstance } from "axios";

// ============================================================================
// Configuration
// ============================================================================

const API_URL = process.env.GIKPSMAIL_API_URL || "http://localhost:3001";
const API_KEY = process.env.GIKPSMAIL_API_KEY;
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "CrimeReport System";
const DEFAULT_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "noreply@crimereport.ng";

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
interface MailAttachment {
  filename: string;
  content: string; // base64 encoded
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
  response?: unknown;
}

// ============================================================================
// HTTP Transporter Class
// ============================================================================

class GikpsMailTransporter {
  private httpClient: AxiosInstance;
  private fromName: string;
  private fromAddress: string;

  constructor(config: { apiUrl?: string; apiKey?: string; fromName?: string; fromAddress?: string } = {}) {
    this.httpClient = axios.create({
      baseURL: config.apiUrl || API_URL,
      timeout: 15000, // 15 second timeout for email delivery
      headers: {
        "X-API-Key": config.apiKey || API_KEY || "",
      },
    });

    this.fromName = config.fromName || DEFAULT_FROM_NAME;
    this.fromAddress = config.fromAddress || DEFAULT_FROM_ADDRESS;
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

    // Build payload for GikpsMail HTTP API
    const payload: Record<string, unknown> = {
      to: toAddresses[0], // Primary recipient
      cc: toAddresses.slice(1), // Remaining recipients as CC if multiple
      subject,
      text,
      html: html || text,
      fromName: fromParsed.name,
      fromEmail: fromParsed.address,
    };

    // Add CC and BCC separately if provided
    const ccList = this.normalizeRecipients(mailOptions.cc);
    if (ccList.length > 0) {
      payload.cc = ccList;
    }

    const bccList = this.normalizeRecipients(mailOptions.bcc);
    if (bccList.length > 0) {
      payload.bcc = bccList;
    }

    // Add attachments if present
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((att) => ({
        filename: att.filename || "attachment",
        content: att.content,
      }));
    }

    try {
      const response = await this.httpClient.post("/api/mail/send", payload);

      return {
        messageId: (response.data as any)?.data?.email?.id || `msg_${Date.now()}`,
        accepted: toAddresses,
        rejected: [],
        response: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        console.error(`[GikpsMail] HTTP ${status}: ${message}`);
        throw new Error(`GikpsMail Transport Error (HTTP ${status}): ${message}`);
      }
      console.error("[GikpsMail] Unexpected error:", error);
      throw new Error(`GikpsMail Transport Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Verify transporter configuration — nodemailer-compatible verify method.
   */
  async verify(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/api/auth/verify");
      return response.status === 200;
    } catch {
      return false;
    }
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
  config?: { apiUrl?: string; apiKey?: string; fromName?: string; fromAddress?: string }
): GikpsMailTransporter {
  return new GikpsMailTransporter(config);
}

// ============================================================================
// Default Transporter Instance (uses env vars)
// ============================================================================

const defaultTransporter = createGikpsMailTransport();

export default defaultTransporter;
