/**
 * Convert basic Markdown formatting to HTML.
 * Handles **bold**, *italic*, and `code`.
 */
function markdownToHTML(text: string): string {
  // **bold** → <b>bold</b> (must come before single *)
  let result = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  // *italic* → <i>italic</i> (only single * not already handled)
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<i>$1</i>')
  // `code` → <code>code</code>
  result = result.replace(/`([^`]+?)`/g, '<code>$1</code>')
  return result
}

/**
 * Strip dangerous HTML (script tags, event handlers, javascript: URLs)
 * while keeping safe formatting tags used in Anki cards.
 * Also converts Markdown-style formatting (*bold*, *italic*) to HTML.
 */
export function sanitizeHTML(html: string): string {
  // Remove script/style tags and their content
  let clean = html.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button)[^>]*>[\s\S]*?<\/\1>/gi, '')
  clean = clean.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button)[^>]*\/?>/gi, '')

  // Remove event handlers (on*)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')

  // Remove javascript: and data: URLs in attributes
  clean = clean.replace(/(?:href|src|action)\s*=\s*(?:"(?:javascript|data|vbscript):[^"]*"|'(?:javascript|data|vbscript):[^']*')/gi, '')

  // Convert Markdown formatting to HTML
  clean = markdownToHTML(clean)

  return clean
}
