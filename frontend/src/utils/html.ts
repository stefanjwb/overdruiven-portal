import DOMPurify from 'dompurify';

/** Haalt alle HTML-tags uit een string, voor tekstfragmenten in kaarten. */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html);
  return (div.textContent ?? '').trim();
}

/** Oudere blogposts zijn platte tekst; nieuwe zijn HTML uit de editor. */
export function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/** Sanitize HTML voor weergave met dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
