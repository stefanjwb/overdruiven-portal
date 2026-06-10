import DOMPurify from 'dompurify';

/** Haalt alle HTML-tags uit een string, voor tekstfragmenten in kaarten. */
export function stripHtml(html: string): string {
  // Spatie na blokelementen zodat alinea's niet aan elkaar plakken
  const spaced = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '$& ');
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(spaced);
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Oudere blogposts zijn platte tekst; nieuwe zijn HTML uit de editor. */
export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/** Sanitize HTML voor weergave met dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
