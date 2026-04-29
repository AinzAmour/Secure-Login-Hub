export function formatAadhaar(value: string): string {
  const digits = value.replace(/\D/g, "");
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : digits;
}

export function unformatAadhaar(value: string): string {
  return value.replace(/\D/g, "");
}
