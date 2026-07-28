/**
 * Robustly sanitizes a string by escaping all characters that can be used 
 * to inject HTML or perform XSS attacks.
 * 
 * @param str The input string to sanitize
 * @returns A sanitized string
 */
export function sanitizeHTML(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'/`=]/g, (s) => map[s]);
}
