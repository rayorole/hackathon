/** Split explicit separators without breaking spaces inside a formatted number. */
export function phoneNumbers(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]+|(?=\+\d)/)
    .map((number) => number.trim())
    .filter(Boolean)
    .filter((number) => {
      const key = canonicalPhone(number);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Normalize only recognizable Belgian numbers; leave other evidence intact. */
function canonicalPhone(value: string) {
  const compact = value.replace(/[\s().-]/g, "").replace(/^00/, "+").replace(/^\+320/, "+32");
  return /^0\d{8,9}$/.test(compact) ? `+32${compact.slice(1)}` : compact;
}
export function phonePresentation(value: string) {
  const canonical = canonicalPhone(value);
  const local = canonical.startsWith("+32") ? `0${canonical.slice(3)}` : "";
  if (/^04[5-9]\d{7}$/.test(local))
    return { label: "mobile" as const, value: local.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4") };
  if (/^0[23]\d{7}$/.test(local))
    return { label: "landline" as const, value: local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4") };
  return { label: "phone" as const, value };
}
