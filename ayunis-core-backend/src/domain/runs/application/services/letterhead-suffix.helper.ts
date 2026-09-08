import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

/**
 * Structure guidance for letters written onto a letterhead.
 *
 * The two-column table is the only layout primitive that survives the Tiptap
 * editor round trip, so it carries the DIN 5008 address field and information
 * block. PDF export detects it by the absence of a header row and renders it
 * borderless at the norm's positions — hence the explicit instruction to head
 * real data tables.
 */
const LETTER_LAYOUT_GUIDANCE = `
When the document is a formal letter on a letterhead, structure the first page so it matches the letterhead's printed design:
1. Open with a two-column table that has no header row: the left cell holds the recipient's address (name, street, postal code and city, one line each), the right cell holds the sender's contact details (case worker, department, phone, e-mail, postal address).
2. Follow it with the subject line as a single bold paragraph, without a "Betreff:" prefix.
3. Then the salutation, the body paragraphs, and the closing with the signer's name and role.
Never repeat the letterhead's own logo, header or footer text — it is already printed on the page. Give real data tables a header row (<th>); a header-less table is reserved for the address and contact block.`;

export function buildLetterheadSuffix(letterheads: Letterhead[]): string {
  if (letterheads.length === 0) return '';
  const lines = letterheads.map((l) => {
    const desc = l.description ? ` — ${l.description}` : '';
    return `- ${l.id}: "${l.name}"${desc}`;
  });
  return (
    '\n\nAvailable letterheads (Briefpapier) for this organization:\n' +
    `${lines.join('\n')}\n` +
    'When the user asks for an official letter or document that should use a specific letterhead, include the letterhead_id parameter.\n' +
    LETTER_LAYOUT_GUIDANCE
  );
}
