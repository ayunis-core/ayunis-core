import { parse } from 'node-html-parser';

export const LAYOUT_TABLE_CLASS = 'letter-layout';

/**
 * Tags header-less tables so the letterhead stylesheet can render them as a
 * DIN 5008 address/information block instead of a bordered data table.
 *
 * The marker is injected at render time instead of being stored in the
 * artifact because the Tiptap editor schema drops classes and unknown
 * attributes: a marker saved in the content would disappear the first time a
 * user edited the letter. Tables, by contrast, survive that round trip.
 *
 * Must run *after* sanitization — `table` has no allowed attributes, so a
 * class added earlier would be stripped again.
 */
export function markLayoutTables(html: string): string {
  const root = parse(html);

  // ponytail: a table without a header row is treated as layout. Tables reach
  // a document only from the model today (the editor toolbar has no table
  // controls), and the tool description tells it to keep data tables headed.
  // If header-less data tables ever show up, replace this with an explicit
  // marker plus a Tiptap attribute that survives saves.
  const layoutTables = root
    .querySelectorAll('table')
    .filter((table) => !table.querySelector('th'));

  if (layoutTables.length === 0) return html;

  for (const table of layoutTables) {
    table.setAttribute('class', LAYOUT_TABLE_CLASS);
  }
  return root.toString();
}
