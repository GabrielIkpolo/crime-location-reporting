import { NextRequest, NextResponse } from "next/server";
import { verifyToken, markEmailAsVerified } from "@/lib/email-verification";

/**
 * GET /api/auth/verify-email/[token]
 * Verifies a user's email address using the token from the verification email.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 }
      );
    }

    // Verify and consume the token
    const userId = await verifyToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark email as verified
    await markEmailAsVerified(userId);

    // Redirect to login page with success message (client-side redirect)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified — CrimeReport</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              display: flex; align-items: center; justify-content: center; 
              min-height: 100vh; margin: 0; background: #f3f4f6; 
            }
            .card { 
              text-align: center; padding: 48px 32px; background: white; 
              border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; 
            }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h1 { margin: 0 0 8px; color: #1a1a2e; }
            p { margin: 0 0 24px; color: #6b7280; }
            a { 
              display: inline-block; padding: 12px 32px; background: #dc2626; 
              color: white; text-decoration: none; border-radius: 8px; font-weight: 600; 
            }
          </style>
          <script>window.location.href = "${baseUrl}/login?verified=true";</script>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>Email Verified!</h1>
            <p>Your email address has been successfully verified. Redirecting you to login...</p>
            <a href="${baseUrl}/login?verified=true">Go to Login</a>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("[VerifyEmail] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
