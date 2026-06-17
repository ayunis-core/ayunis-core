import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

export function buildLetterheadSuffix(letterheads: Letterhead[]): string {
  if (letterheads.length === 0) return '';
  const lines = letterheads.map((l) => {
    const desc = l.description ? ` — ${l.description}` : '';
    return `- ${l.id}: "${l.name}"${desc}`;
  });
  return (
    '\n\nAvailable letterheads (Briefpapier) for this organization:\n' +
    `${lines.join('\n')}\n` +
    'When the user asks for an official letter or document that should use a specific letterhead, include the letterhead_id parameter.'
  );
}
