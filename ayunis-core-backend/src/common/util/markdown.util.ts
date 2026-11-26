/** Makes user-given text render literally inside markdown. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+\-!|~]/g, '\\$&');
}
