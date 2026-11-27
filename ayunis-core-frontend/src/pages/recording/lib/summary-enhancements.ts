import type { RecordingTranscriptTurnDto } from '@ayunis/api-client/schemas';
import type { SpeakerNames } from '@/pages/recording/model/useSpeakerNames';

const SECTION_COUNT = 6;
const PARTICIPANTS = 1;
const ACTION_ITEMS = 4;
const UNREFERENCED_SECTIONS = 2;
const MIN_SHARED_WORDS = 2;

function splitSections(markdown: string): string[] | null {
  const parts = markdown.split(/^(?=## )/m);
  const sections = parts.filter((part) => part.startsWith('## '));
  return sections.length === SECTION_COUNT && parts.length === SECTION_COUNT
    ? sections
    : null;
}

function cleanName(raw: string): string | undefined {
  const value = raw.replace(/\*/g, '').trim();
  if (/nicht|not |unknown|unbekannt|[/,]/i.test(value)) return undefined;
  const name = value.replace(/\([^()]*\)/g, '').trim();
  const words = name.split(/\s+/).filter(Boolean).length;
  return words >= 1 && words <= 4 ? name : undefined;
}

function unclearNames(raw: string): string | undefined {
  const value = raw
    .replace(/\*/g, '')
    .replace(/\([^()]*\)/g, '')
    .trim();
  const isChoice = /\/|\boder\b|\bor\b|bzw\./i.test(value);
  return isChoice && !/nicht|not /i.test(value) ? value : undefined;
}

function participantDescriptions(summary: string): Map<number, string> {
  const descriptions = new Map<number, string>();
  const sections = splitSections(summary);
  if (!sections) return descriptions;
  for (const line of sections[PARTICIPANTS].split('\n')) {
    const plain = line.replace(/\*/g, '');
    const match = /(?:Speaker|Sprecher) (\d+) ?[:–—-]/.exec(plain);
    if (!match) continue;
    descriptions.set(
      Number(match[1]),
      plain.slice(match.index + match[0].length),
    );
  }
  return descriptions;
}

export function suggestSpeakerNames(summary: string): SpeakerNames {
  const names: SpeakerNames = {};
  for (const [number, description] of participantDescriptions(summary)) {
    const name = cleanName(description);
    if (name) names[number] = name;
  }
  return names;
}

export function unclearSpeakerNames(summary: string): SpeakerNames {
  const names: SpeakerNames = {};
  for (const [number, description] of participantDescriptions(summary)) {
    const unclear = unclearNames(description);
    if (unclear) names[number] = unclear;
  }
  return names;
}

export function withNamedParticipants(
  summary: string,
  names: SpeakerNames,
): string {
  const sections = splitSections(summary);
  if (!sections) return summary;
  sections[PARTICIPANTS] = sections[PARTICIPANTS].split('\n')
    .map((line) => {
      const match = /(?:Speaker|Sprecher) (\d+)/.exec(line);
      const name = match ? names[Number(match[1])]?.trim() : undefined;
      return name ? `- **${name}**` : line;
    })
    .join('\n');
  return sections.join('');
}

export function withoutActionItems(summary: string): string {
  const sections = splitSections(summary);
  if (!sections) return summary;
  return sections
    .filter((_, index) => index !== ACTION_ITEMS)
    .join('')
    .replace(/\n---\s*$/, '\n');
}

const wordsOf = (text: string) =>
  new Set(text.toLowerCase().match(/[a-zäöüß0-9]{5,}/g) ?? []);

function bestTurn(text: string, turnWords: Set<string>[]): number | undefined {
  const words = wordsOf(text);
  let best: number | undefined;
  let bestScore = MIN_SHARED_WORDS - 1;
  turnWords.forEach((candidate, index) => {
    let score = 0;
    for (const word of words) if (candidate.has(word)) score += 1;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

const isReferencable = (line: string) =>
  line.trim() !== '' && !/^\s*(?:#|\||>|---)/.test(line);

const turnCitationId = (turnIndex: number) =>
  `00000000-0000-4000-8000-${turnIndex.toString(16).padStart(12, '0')}`;

export function turnIndexOfCitation(chunkId: string): number {
  return Number.parseInt(chunkId.slice(-12), 16);
}

function splitSentences(line: string): string[] {
  return line.split(/(?<=[^\d\s][.!?;]) (?=\p{Lu})/u);
}

export function withTimeReferences(
  summary: string,
  turns: RecordingTranscriptTurnDto[],
): string {
  if (turns.length === 0) return summary;
  const turnWords = turns.map((turn) => wordsOf(turn.text));
  const numbers = new Map<number, number>();

  const annotate = (line: string) => {
    const sentences = splitSentences(line);
    const matches = sentences.map((sentence) => bestTurn(sentence, turnWords));
    return sentences
      .map((sentence, index) => {
        const turn = matches[index];
        if (turn === undefined || matches[index + 1] === turn) return sentence;
        if (!numbers.has(turn)) numbers.set(turn, numbers.size + 1);
        return `${sentence} {{source:${turnCitationId(turn)}|${numbers.get(turn)}}}`;
      })
      .join(' ');
  };

  let headings = 0;
  return summary
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) headings += 1;
      return headings > UNREFERENCED_SECTIONS && isReferencable(line)
        ? annotate(line)
        : line;
    })
    .join('\n');
}
