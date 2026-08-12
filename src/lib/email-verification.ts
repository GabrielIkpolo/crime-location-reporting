/**
 * Email Verification Service — PLACEHOLDER (NOT YET INTEGRATED)
 * 
 * This service provides the complete email verification workflow structure.
 * All email-sending functions are currently placeholders with clear integration points.
 * 
 * DO NOT integrate until you provide your GikpsMail adapter.
 * The app's login flow is NOT modified — everything stays live and working.
 * 
 * Integration Checklist (when ready):
 * 1. Run: npx prisma migrate dev --name add_email_verification_token
 *    (EmailVerificationToken model already added to schema.prisma)
 * 2. Replace sendVerificationEmail() with your GikpsMail adapter call
 * 3. Uncomment the email trigger in registerUserAction (src/app/actions/auth.ts)
 * 4. Uncomment the email trigger in /api/auth/verify-email/send route
 * 
 * Your GikpsMail adapter will be integrated like this:
 *   import { createTransport } from './gikpsmail-adapter';
 *   const transporter = createTransport({ auth: { api_key: process.env.GIKPSMAIL_API_KEY } });
 *   await transporter.sendMail({ to, subject, html, text });
 */

import prisma from "@/lib/prisma";
import crypto from "crypto";
import type { EmailVerificationToken } from "@prisma/client";

// ============================================================================
// EMAIL SENDING — PLACEHOLDER (DO NOT INTEGRATE YET)
// ============================================================================

/**
 * Send verification email to user.
 * 
 * TODO: INTEGRATE YOUR GIKPSMAIL ADAPTER HERE
 * Replace the placeholder implementation below with your actual nodemailer/GikpsMail call.
 * 
 * Example of what this will look like once integrated:
 * 
 *   import { createTransport } from "@/utils/gikpsmail-adapter";
 *   
 *   const transporter = createTransport({
 *     auth: {
 *       api_key: process.env.GIKPSMAIL_API_KEY!,
 *       fromName: "CrimeReport System",
 *       fromAddress: "noreply@crimereport.ng"
 *     }
 *   });
 *   
 *   await transporter.sendMail({
 *     to: email,
 *     subject: "Verify your CrimeReport account",
 *     html: `...`,
 *     text: `...`
 *   });
 */
async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  // ========================================================================
  // PLACEHOLDER — DO NOT INTEGRATE YET
  // ========================================================================
  // The actual email sending will be implemented when you provide your
  // GikpsMail adapter. Until then, this function does nothing.
  
  console.log(`[EmailVerification] Placeholder: Would send verification email to ${email}`);
  console.log(`[EmailVerification] Token: ${token}`);
  console.log(`[EmailVerification] User: ${name}`);
  // ========================================================================
  
  /*
   * TODO: INTEGRATE GIKPSMAIL ADAPTER — Uncomment and replace the above with:
   * 
   * const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email/${token}`;
   * 
   * await transporter.sendMail({
   *   to: email,
   *   subject: "Verify your CrimeReport account",
   *   html: `
   *     <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
   *       <h1>Welcome to CrimeReport, ${name}!</h1>
   *       <p>Please verify your email address by clicking the button below:</p>
   *       <a href="${verificationUrl}" 
   *          style="display: inline-block; padding: 12px 24px; background-color: #dc2626; 
   *                 color: white; text-decoration: none; border-radius: 8px;">
   *         Verify Email Address
   *       </a>
   *       <p>This link will expire in 24 hours.</p>
   *       <p>If you didn't create an account, you can safely ignore this email.</p>
   *     </div>
   *   `,
   *   text: `Welcome to CrimeReport, ${name}!\n\nPlease verify your email by visiting:\n${verificationUrl}\n\nThis link expires in 24 hours.`
   * });
   */
}

/**
 * Send password reset email.
 * 
 * TODO: INTEGRATE YOUR GIKPSMAIL ADAPTER HERE (same adapter as above)
 */
async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  // ========================================================================
  // PLACEHOLDER — DO NOT INTEGRATE YET
  // ========================================================================
  console.log(`[EmailVerification] Placeholder: Would send password reset email to ${email}`);
  console.log(`[EmailVerification] Token: ${token}`);
  // ========================================================================
  
  /*
   * TODO: INTEGRATE GIKPSMAIL ADAPTER — Uncomment and replace the above with:
   * 
   * const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;
   * 
   * await transporter.sendMail({
   *   to: email,
   *   subject: "Reset your CrimeReport password",
   *   html: `...`,
   *   text: `...`
   * });
   */
}

/**
 * Send bulk action notification emails.
 * 
 * TODO: INTEGRATE YOUR GIKPSMAIL ADAPTER HERE (same adapter as above)
 */
async function sendBulkActionNotification(
  adminEmail: string,
  actionType: "approve" | "reject",
  count: number
): Promise<void> {
  // ========================================================================
  // PLACEHOLDER — DO NOT INTEGRATE YET
  // ========================================================================
  console.log(`[EmailVerification] Placeholder: Would send bulk notification to ${adminEmail}`);
  console.log(`[EmailVerification] Action: ${actionType}, Count: ${count}`);
  // ========================================================================
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
// WORKFLOW FUNCTIONS (NOT YET TRIGGERED)
// ============================================================================

/**
 * Send verification email after registration.
 * 
 * TODO: INTEGRATE — Call this function in registerUserAction after user creation.
 * Currently NOT called from anywhere to keep the app working.
 */
export async function sendRegistrationVerificationEmail(
  userId: string,
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { token } = await createVerificationToken(userId, email);
    
    // TODO: INTEGRATE — Uncomment the line below when GikpsMail adapter is ready
    // await sendVerificationEmail(email, token, name);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    console.error("[EmailVerification] Error:", errorMessage);
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
    
    // TODO: INTEGRATE — Uncomment the line below when GikpsMail adapter is ready
    // await sendVerificationEmail(email, token, name);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to resend verification email";
    console.error("[EmailVerification] Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmailWorkflow(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.passwordResetToken.create({
      data: {
        token,
        identifier: email,
        userId,
        expires: expiresAt,
      },
    });

    // TODO: INTEGRATE — Uncomment the line below when GikpsMail adapter is ready
    // await sendPasswordResetEmail(email, token);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send password reset email";
    console.error("[EmailVerification] Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export default {
  // Token management
  generateToken,
  createVerificationToken,
  verifyToken,
  isEmailVerified,
  markEmailAsVerified,
  
  // Workflow functions (not yet triggered)
  sendRegistrationVerificationEmail,
  resendVerificationEmail,
  sendPasswordResetEmailWorkflow,
};
