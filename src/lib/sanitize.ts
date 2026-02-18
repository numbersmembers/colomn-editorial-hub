/**
 * Strip all HTML tags from a string, leaving only text content.
 * Used to safely render search results that may contain HTML formatting.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
