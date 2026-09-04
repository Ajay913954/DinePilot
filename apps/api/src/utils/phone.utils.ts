/**
 * Normalize phone numbers to canonical E.164-style standard (+919876543210)
 * Handles input variations:
 * "+91 98765 43210" -> "+919876543210"
 * "919876543210"     -> "+919876543210"
 * "09876543210"      -> "+919876543210"
 * "9876543210"       -> "+919876543210"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  const clean = phone.trim();
  const digitsOnly = clean.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+91${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  if (clean.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  return digitsOnly ? `+${digitsOnly}` : clean;
}
