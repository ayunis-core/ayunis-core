import { copyableMessageContent } from '@/pages/chat/lib/copyable-message-content';
import { SPEECH_TEXT_ATTRIBUTE } from '@/widgets/markdown';

/**
 * The text of an answer as it should be read aloud: the same text blocks copy
 * takes, with every node that carries a speech override (PII masks, code
 * blocks, citations) replaced by it and tables read row by row.
 */
export function speakableMessageText(container: Element): string {
  return Array.from(
    container.querySelectorAll('[data-copyable="true"]'),
    speakableBlockText,
  )
    .filter(Boolean)
    .join('\n\n');
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** Whether markdown leaves anything to read once code blocks are dropped. */
export function hasSpeakableText(markdown: string): boolean {
  let openFence: string | undefined;
  for (const line of markdown.split('\n')) {
    const fence = FENCE.exec(line)?.[1];
    if (openFence) {
      if (fence?.startsWith(openFence)) openFence = undefined;
    } else if (fence) {
      openFence = fence;
    } else if (line.trim()) {
      return true;
    }
  }
  return false;
}

function speakableBlockText(block: Element): string {
  const clone = block.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return '';

  clone.querySelectorAll(`[${SPEECH_TEXT_ATTRIBUTE}]`).forEach((node) => {
    node.replaceWith(node.getAttribute(SPEECH_TEXT_ATTRIBUTE) ?? '');
  });
  clone.querySelectorAll('table').forEach((table) => {
    table.replaceWith(tableAsSentences(table));
  });

  return stripMarkdownSymbols(copyableMessageContent(clone).text);
}

function tableAsSentences(table: HTMLTableElement): HTMLElement {
  const sentences = document.createElement('div');
  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells, (cell) =>
      cell.textContent.trim(),
    ).filter(Boolean);
    if (cells.length === 0) continue;
    const sentence = document.createElement('p');
    sentence.textContent = `${cells.join(', ')}.`;
    sentences.append(sentence);
  }
  return sentences;
}

function stripMarkdownSymbols(text: string): string {
  return text
    .replace(/\*\*|__|~~|`/g, '')
    .replace(/^[ \t]*(?:#{1,6}|>)[ \t]+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
