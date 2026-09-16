/** Split explicit separators without breaking spaces inside a formatted number. */
export function phoneNumbers(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]+|(?=\+\d)/)
    .map((number) => number.trim())
    .filter(Boolean)
    .filter((number) => {
      const key = number.replace(/[\s().-]/g, "").replace(/^00/, "+");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
