export function normalizePhoneNumber(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeKoreanAuthPhone(value: string | null | undefined) {
  const digits = normalizePhoneNumber(value);
  if (digits.startsWith("82")) return `0${digits.slice(2)}`;

  return digits;
}

export function isKoreanMobilePhoneNumber(value: string | null | undefined) {
  return /^010\d{8}$/.test(normalizeKoreanAuthPhone(value));
}

export function toKoreanE164Phone(value: string | null | undefined) {
  const digits = normalizePhoneNumber(value);
  if (digits.length < 10 || digits.length > 11) return null;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("82")) return `+${digits}`;

  return null;
}
