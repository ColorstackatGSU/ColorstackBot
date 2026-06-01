function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isLikelyLinkedInUrl(value) {
  const input = String(value || '').trim();
  if (!input) return false;

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return /(^|\.)linkedin\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function normalizeLinkedInUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  return input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
}

function isGsuEmail(value, domains = ['student.gsu.edu', 'gsu.edu']) {
  if (!isLikelyEmail(value)) return false;
  const domain = String(value).trim().toLowerCase().split('@')[1] || '';
  return domains.some((allowed) => domain === String(allowed).trim().toLowerCase());
}

function isSupportedImageAttachment(attachment) {
  if (!attachment) return false;
  const contentType = String(attachment.content_type || '').toLowerCase();
  if (contentType === 'image/png' || contentType === 'image/jpeg') return true;
  return /\.(png|jpe?g)$/i.test(attachment.filename || '');
}

module.exports = {
  isGsuEmail,
  isLikelyEmail,
  isLikelyLinkedInUrl,
  isSupportedImageAttachment,
  normalizeLinkedInUrl
};
