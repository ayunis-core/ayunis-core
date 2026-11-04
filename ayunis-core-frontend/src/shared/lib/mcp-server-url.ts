export function isValidMcpServerUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}
