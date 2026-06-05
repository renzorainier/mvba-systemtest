// Shared field validators used by the portal forms.
// Each validator returns an error string, or '' when the value is valid.

// Letters (incl. accented / ñ), spaces, hyphens, apostrophes and periods.
// Must start with a letter so "123" or "-x" are rejected.
const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u;

// Simple but effective email shape: something@something.tld
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value, label = 'This field', { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? `${label} is required.` : '';
  if (!NAME_RE.test(v)) return `${label} can only contain letters, spaces, hyphens, and apostrophes.`;
  return '';
}

export function validateEmail(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'Email is required.' : '';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address (e.g. name@example.com).';
  return '';
}

export function validatePhone(value, { required = true } = {}) {
  const v = String(value || '').trim();
  if (!v) return required ? 'Phone number is required.' : '';
  if (!/^\d+$/.test(v)) return 'Phone number must contain digits only.';
  if (v.length > 11) return 'Phone number must be at most 11 digits.';
  return '';
}

// Strip everything except digits and cap at `max` characters.
// Use on a phone input's onChange so the field can only ever hold digits.
export function sanitizePhone(value, max = 11) {
  return String(value || '').replace(/\D/g, '').slice(0, max);
}

// Keep only digits and a single decimal point, limiting the fractional part
// to `decimals` places (default 2). Use on numeric input onChange so the user
// can never enter more than two decimal places. Returns a string.
export function sanitizeDecimal(value, decimals = 2) {
  let v = String(value ?? '').replace(/[^\d.]/g, '');

  const firstDot = v.indexOf('.');
  if (firstDot === -1) return v;

  const intPart = v.slice(0, firstDot);
  const decPart = v.slice(firstDot + 1).replace(/\./g, '').slice(0, decimals);
  return `${intPart}.${decPart}`;
}
