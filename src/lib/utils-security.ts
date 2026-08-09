/**
 * Robustly sanitizes a string by escaping all characters that can be used
 * to inject HTML or perform XSS attacks.
 *
 * Uses DOMPurify for production-grade sanitization of HTML content,
 * preventing SVG/iframe injection and event handler attacks.
 *
 * @param str The input string to sanitize
 * @returns A sanitized string safe for use in innerHTML or bindPopup()
 */

// Server-side: basic escaping (DOMPurify requires a DOM environment)
function basicEscapeHTML(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  return str.replace(/[&<>"'/`=]/g, (s) => map[s]);
}

/**
 * Browser-side sanitization using DOMPurify.
 * Dynamically imports DOMPurify to avoid SSR issues — the import only
 * executes on the client where a real DOM is available.
 */
async function sanitizeWithDOMPurify(str: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify().sanitize(str, {
    ALLOWED_TAGS: ["b", "i", "u", "strong", "em", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * Sanitize user-generated HTML content.
 *
 * On the client, uses DOMPurify for production-grade XSS protection.
 * On the server (SSR), falls back to basic entity escaping since
 * DOMPurify requires a real browser DOM.
 */
export async function sanitizeHTML(str: string): Promise<string> {
  if (typeof window !== "undefined") {
    try {
      return await sanitizeWithDOMPurify(str);
    } catch {
      // If DOMPurify fails for any reason, fall back to basic escaping
      return basicEscapeHTML(str);
    }
  }

  // Server-side: use basic escaping
  return basicEscapeHTML(str);
}
