import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimits } from "@/lib/rate-limiter";

/**
 * Send a password reset confirmation email via GikpsMail.
 */
async function sendPasswordResetConfirmationEmail(email: string, userName: string): Promise<void> {
  const transporter = await import("@/lib/gikpsmail-adapter").then(m => m.default);

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
                <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 8px;">🔐</div>
                  <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">Password Reset Successful</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 24px; font-size: 18px; color: #1a1a2e; font-weight: 600;">Hello ${userName},</p>
                  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #6b7280;">
                    Your password has been successfully reset. You can now log in to your CrimeReport account with your new password.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login"
                           style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Sign In to CrimeReport
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top: 24px; padding: 16px; background-color: #fee2e2; border-radius: 8px; font-size: 13px; color: #991b1b;">
                    ⚠️ If you did NOT request this password reset, please contact support immediately. Your account may be compromised.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    © ${new Date().getFullYear()} CrimeReport System. All rights reserved.
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
    to: email,
    subject: "✅ Your CrimeReport Password Has Been Reset",
    html,
    text: `Hello ${userName},\n\nYour password has been successfully reset. You can now log in with your new password at ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login\n\nIf you did not request this change, contact support immediately.`,
  });
}

/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests per hour per IP (Audit fix Phase 3 #4)
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimits.passwordReset(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token, newPassword } = body;

    // Validate inputs
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    // Check expiry
    if (resetToken.expires < new Date()) {
      // Delete the expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Send confirmation email (non-blocking — don't fail if email fails)
    try {
      const userEmail = resetToken.user.email;
      const userName = (resetToken.user.name as string) || "User";
      
      if (!userEmail) {
        throw new Error("User email is missing");
      }

      await sendPasswordResetConfirmationEmail(userEmail, userName);
    } catch (emailError) {
      console.error("[ResetPassword] Confirmation email failed:", emailError);
      // Don't fail the password reset if email delivery fails
    }

    return NextResponse.json(
      { message: "Password has been reset successfully. A confirmation email has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
