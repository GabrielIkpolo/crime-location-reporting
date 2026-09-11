import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limiter";

/**
 * Escape HTML special characters to prevent template injection and rendering issues.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support_crimereport@gikpsmail.com";

/**
 * POST /api/contact
 * Handles contact form submissions.
 * 1. Stores the message in the database (for admin review)
 * 2. Sends an email to support via GikpsMail
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting per IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimits.passwordReset(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, subject, message } = body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (typeof subject !== "string" || subject.trim().length < 2) {
      return NextResponse.json(
        { error: "Subject must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters." },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim().slice(0, 200);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedSubject = subject.trim().slice(0, 200);
    const sanitizedMessage = message.trim().slice(0, 5000);

    // Step 1: Store the message in the database for admin review
    try {
      await prisma.contactMessage.create({
        data: {
          name: sanitizedName,
          email: sanitizedEmail,
          subject: sanitizedSubject,
          message: sanitizedMessage,
        },
      });
    } catch (dbError) {
      console.error("[Contact] Failed to save message to database:", dbError);
      // Continue with email sending even if DB fails
    }

    // Step 2: Send email to support via GikpsMail
    try {
      const { createGikpsMailTransport } = await import("@/lib/gikpsmail-adapter");
      
      // Use default transporter (system from address) — custom from addresses cause blank fields in GikpsMail web UI
      const transporter = createGikpsMailTransport();

      // Escape all user-generated content to prevent HTML injection and rendering issues
      const escapedName = escapeHtml(sanitizedName);
      const escapedEmail = escapeHtml(sanitizedEmail);
      const escapedSubject = escapeHtml(sanitizedSubject);
      const escapedMessage = escapeHtml(sanitizedMessage);
      const escapedIp = escapeHtml(ip);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" max-width="500px" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                      <div style="font-size: 32px; margin-bottom: 8px;">📬</div>
                      <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 700;">New Contact Message</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px;">
                      <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;"><strong>From:</strong></p>
                        <p style="margin: 0 0 16px; font-size: 15px;">${escapedName} &lt;${escapedEmail}&gt;</p>
                        
                        <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;"><strong>Subject:</strong></p>
                        <p style="margin: 0 0 20px; font-size: 15px;">${escapedSubject}</p>
                        
                        <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;"><strong>Message:</strong></p>
                          <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapedMessage}</p>
                        </div>
                        
                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                          Received on ${new Date().toLocaleString()} from IP: ${escapedIp}
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        © ${new Date().getFullYear()} CrimeReport System — Contact Form Submission
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await transporter.sendMail({
        to: SUPPORT_EMAIL,
        subject: `[CrimeReport Contact] From: ${escapedName} (${escapedEmail}) - ${escapedSubject}`,
        html,
        text: `New contact message from ${sanitizedName} (${sanitizedEmail})\n\nSubject: ${sanitizedSubject}\n\nMessage:\n${sanitizedMessage}\n\nReceived on ${new Date().toLocaleString()}`,
      });

      console.log(`[Contact] ✅ Email sent to support: ${SUPPORT_EMAIL}`);
    } catch (emailError) {
      console.error("[Contact] Failed to send email:", emailError);
      // Don't fail the request if email fails — message is still saved in DB
    }

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Contact] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
