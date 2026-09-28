export function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const code = c.charCodeAt(0);
    const limit = c <= 'Z' ? 90 : 122;
    const rotated = code + 13;
    return String.fromCharCode(limit >= rotated ? rotated : rotated - 26);
  });
}
