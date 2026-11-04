export function isValidMcpServerUrl(serverUrl: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(serverUrl).protocol);
  } catch {
    return false;
  }
}
