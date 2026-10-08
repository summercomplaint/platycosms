/**
 * The small Markdown subset used by the files in content/: paragraphs (blank-line separated), **bold**, *italic*
 * and [links](https://...). A link to #id (like [the torocosm](#c1)) switches to that platycosm. Everything is
 * escaped first, so any other markup shows as plain text.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(src: string): string {
  return esc(src.trim().replace(/\s*\n\s*/g, ' '))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[([^\]]+)\]\((#[a-z0-9]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');
}

export function paragraphs(src: string): string {
  return src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${inline(p)}</p>`).join('');
}
