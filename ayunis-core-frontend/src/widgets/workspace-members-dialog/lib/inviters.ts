export function joinWithAnd(parts: string[], and: string): string {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} ${and} ${parts[parts.length - 1]}`;
}
