/**
 * Email Verification Service — FULLY INTEGRATED WITH GIKPSMAIL
 * 
 * This service provides the complete email verification workflow.
 * All email sending is handled via the GikpsMail HTTP adapter.
 * 
 * Integration:
 * 1. Uses createGikpsMailTransport() from "@/lib/gikpsmail-adapter"
 * 2. Called automatically after user registration
 * 3. Used in forgot-password and reset-password flows
 */

import prisma from "@/lib/prisma";
import crypto from "crypto";
import { createGikpsMailTransport } from "./gikpsmail-adapter";

// Create transporter instance with app-specific settings
const transporter = createGikpsMailTransport({
  fromName: process.env.EMAIL_FROM_NAME || "CrimeReport System",
  fromAddress: process.env.EMAIL_FROM_ADDRESS || "noreply@crimereport.ng",
});

// ============================================================================
// EMAIL TEMPLATES — HTML & Plain Text
// ============================================================================

/**
 * Generate HTML email template for account verification.
 */
function buildVerificationEmail(name: string, verifyUrl: string): { html: string; text: string } {
  const textColor = "#1a1a2e";
  const mutedColor = "#6b7280";
  const accentColor = "#dc2626";

  return {
    html: `
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
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">CrimeReport</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 22px; color: ${textColor};">Welcome, ${name}!</h2>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${mutedColor};">
                      Thank you for joining CrimeReport — Nigeria's community-powered crime reporting platform. 
                      To complete your registration, please verify your email address by clicking the button below:
                    </p>
                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center">
                          <a href="${verifyUrl}" 
                             style="display: inline-block; padding: 14px 32px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                            Verify My Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!-- Fallback link -->
                    <p style="margin: 24px 0 0; font-size: 13px; color: ${mutedColor}; word-break: break-all;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${verifyUrl}" style="color: ${accentColor};">${verifyUrl}</a>
                    </p>
                    <!-- Expiry notice -->
                    <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;">
                      ⏰ This verification link will expire in <strong>24 hours</strong>.
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 13px; color: ${mutedColor};">
                      If you didn't create an account, you can safely ignore this email.
                    </p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
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
    `,
    text: `Welcome to CrimeReport, ${name}!\n\nPlease verify your email address by visiting:\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n\n© ${new Date().getFullYear()} CrimeReport System`,
  };
}

/**
 * Generate HTML email template for password reset.
 */
function buildPasswordResetEmail(resetUrl: string): { html: string; text: string } {
  const textColor = "#1a1a2e";
  const mutedColor = "#6b7280";
  const accentColor = "#dc2626";

  return {
    html: `
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
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">Reset Your Password</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${mutedColor};">
                      We received a request to reset your password for your CrimeReport account. 
                      Click the button below to choose a new password:
                    </p>
                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" 
                             style="display: inline-block; padding: 14px 32px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!-- Fallback link -->
                    <p style="margin: 24px 0 0; font-size: 13px; color: ${mutedColor}; word-break: break-all;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: ${accentColor};">${resetUrl}</a>
                    </p>
                    <!-- Expiry notice -->
                    <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;">
                      ⏰ This reset link will expire in <strong>1 hour</strong>.
                    </div>
                    <!-- Security warning -->
                    <div style="margin-top: 16px; padding: 16px; background-color: #fee2e2; border-radius: 8px; font-size: 13px; color: #991b1b;">
                      ⚠️ If you didn't request a password reset, please ignore this email or contact support if you suspect unauthorized access.
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 13px; color: ${mutedColor};">
                      This email was sent because a password reset was requested for your account.
                    </p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
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
    `,
    text: `Password Reset Request\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.\n\n© ${new Date().getFullYear()} CrimeReport System`,
  };
}

/**
 * Generate HTML email template for SOS emergency alert.
 */
function buildSOSAlertEmail(contactName: string, locationUrl: string): { html: string; text: string } {
  const textColor = "#1a1a2e";
  const mutedColor = "#6b7280";

  return {
    html: `
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
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 8px;">🚨</div>
                    <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 700;">EMERGENCY ALERT</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px; font-size: 18px; line-height: 1.6; color: ${textColor};">
                      <strong>${contactName}</strong>, an emergency alert has been triggered!
                    </p>
                    <div style="padding: 20px; background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
                      <p style="margin: 0 0 12px; font-size: 16px; color: #991b1b; font-weight: 600;">
                        Someone needs help right now.
                      </p>
                      <a href="${locationUrl}" 
                         target="_blank"
                         style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                        📍 View Location on Google Maps
                      </a>
                    </div>
                    <p style="margin: 0; font-size: 14px; color: ${mutedColor};">
                      This alert was sent automatically by the CrimeReport SOS system. 
                      Please respond as quickly as possible.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      © ${new Date().getFullYear()} CrimeReport System — Emergency SOS Alert
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `EMERGENCY ALERT\n\n${contactName}, an emergency alert has been triggered!\n\nSomeone needs help right now.\nView Location: ${locationUrl}\n\nThis alert was sent automatically by the CrimeReport SOS system. Please respond as quickly as possible.`,
  };
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send verification email to user.
 */
async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  // Use API route for verification (more secure than direct endpoint)
  const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`;

  const { html, text } = buildVerificationEmail(name, verifyUrl);

  await transporter.sendMail({
    to: email,
    subject: "Verify your CrimeReport account",
    html,
    text,
  });
}

/**
 * Send password reset email.
 */
async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  const { html, text } = buildPasswordResetEmail(resetUrl);

  await transporter.sendMail({
    to: email,
    subject: "Reset your CrimeReport password",
    html,
    text,
  });
}

/**
 * Send SOS emergency alert email.
 */
async function sendSOSAlertEmail(
  contactEmail: string,
  contactName: string,
  locationUrl: string
): Promise<void> {
  const { html, text } = buildSOSAlertEmail(contactName, locationUrl);

  await transporter.sendMail({
    to: contactEmail,
    subject: "🚨 EMERGENCY ALERT - Someone Needs Help Now!",
    html,
    text,
  });
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate a cryptographically secure verification token.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new email verification token for a user.
 */
export async function createVerificationToken(
  userId: string,
  email: string
): Promise<{ token: string; expiresAt: Date }> {
  // Invalidate any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      token,
      identifier: email,
      userId,
      expires: expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Verify and consume a verification token.
 * Returns the user ID if valid, null otherwise.
 */
export async function verifyToken(token: string): Promise<string | null> {
  const existingToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return null;
  }

  // Check if expired
  if (new Date() > existingToken.expires) {
    await prisma.emailVerificationToken.delete({
      where: { id: existingToken.id },
    });
    return null;
  }

  // Consume the token (delete it so it can't be reused)
  await prisma.emailVerificationToken.delete({
    where: { id: existingToken.id },
  });

  return existingToken.userId;
}

/**
 * Check if a user's email is verified.
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return !!user?.emailVerified;
}

/**
 * Mark a user's email as verified.
 */
export async function markEmailAsVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

// ============================================================================
// WORKFLOW FUNCTIONS (NOW ACTIVE)
// ============================================================================

/**
 * Send verification email after registration.
 */
export async function sendRegistrationVerificationEmail(
  userId: string,
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { token } = await createVerificationToken(userId, email);
    await sendVerificationEmail(email, token, name);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    console.error("[EmailVerification] Registration email error:", errorMessage);
    // Don't fail registration if email fails — log and continue
    return { success: false, error: errorMessage };
  }
}

/**
 * Resend verification email.
 */
export async function resendVerificationEmail(
  userId: string,
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { token } = await createVerificationToken(userId, email);
    await sendVerificationEmail(email, token, name);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to resend verification email";
    console.error("[EmailVerification] Resend email error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send password reset email workflow.
 */
export async function sendPasswordResetEmailWorkflow(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        identifier: email,
        userId,
        expires: expiresAt,
      },
    });

    await sendPasswordResetEmail(email, token);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send password reset email";
    console.error("[EmailVerification] Reset email error:", errorMessage);
    // Don't fail the forgot-password flow if email fails — token is still created
    return { success: false, error: errorMessage };
  }
}

// Export sendSOSAlertEmail for use in SOS API route
export { sendSOSAlertEmail };

export default {
  generateToken,
  createVerificationToken,
  verifyToken,
  isEmailVerified,
  markEmailAsVerified,
  sendRegistrationVerificationEmail,
  resendVerificationEmail,
  sendPasswordResetEmailWorkflow,
};
