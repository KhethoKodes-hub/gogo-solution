export function sanitizeInput(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function sanitizeEmail(value: string) {
  return sanitizeInput(value).toLowerCase();
}
