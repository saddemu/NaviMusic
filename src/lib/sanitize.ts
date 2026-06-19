import DOMPurify from 'dompurify';

// Force bio links to open in a new tab without window.opener access.
// Hook is installed once at module load, so every sanitizeBio() call inherits it.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeBio(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'em', 'strong', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}
