export function normalizeBrPhoneLocal11(v: string): string {
  const digits = String(v ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  let d = digits;
  if (d.startsWith('55')) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  return d;
}

export function normalizeBrPhone(v: string): string {
  // Backward-compatible export name: now returns local 10-11 digits without +55
  return normalizeBrPhoneLocal11(v);
}

export function isLikelyLocal11(v: string): boolean {
  return /^\d{10,11}$/.test(String(v ?? '').trim());
}

export function isLikelyE164(v: string): boolean {
  // Backward-compat: we now validate local 10-11 digits
  return isLikelyLocal11(v);
}
