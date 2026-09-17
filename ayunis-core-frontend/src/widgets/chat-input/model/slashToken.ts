export interface SlashToken {
  start: number;
  end: number;
  query: string;
}

export function readSlashToken(
  value: string,
  caret: number,
): SlashToken | null {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf('/');
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(before[start - 1])) return null;
  const query = before.slice(start + 1);
  if (/\s/.test(query)) return null;
  return { start, end: caret, query };
}

export function removeSlashToken(value: string, token: SlashToken): string {
  return value.slice(0, token.start) + value.slice(token.end);
}

export function matchSkills<T extends { name: string }>(
  skills: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter((skill) => skill.name.toLowerCase().includes(needle));
}
