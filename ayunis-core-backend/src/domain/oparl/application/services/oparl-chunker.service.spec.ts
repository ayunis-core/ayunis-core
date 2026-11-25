import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import type { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import {
  SplitResult,
  TextChunk,
} from 'src/domain/rag/splitters/domain/split-result.entity';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import type { OparlTextObject } from 'src/domain/oparl/application/models/oparl-document';
import { OparlChunker } from './oparl-chunker.service';

const splitText = {
  execute: (command: SplitTextCommand) =>
    new SplitResult([new TextChunk(command.text)]),
} as unknown as SplitTextUseCase;

const agendaItem = (
  overrides: Partial<OparlTextObject> = {},
): OparlTextObject => ({
  source: OparlChunkSource.AGENDA_ITEM,
  id: '5f3c2b1a-0d9e-4c8b-a7f6-e5d4c3b2a190',
  bodyId: '9c2f4e1a-3b5d-4f6e-8a7b-1c2d3e4f5a6b',
  meetingId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  date: '2024-09-12',
  parts: ['3.1 Ausbau der Kita Michelbach', 'beschlossen', null],
  chunkedHash: null,
  ...overrides,
});

describe('OparlChunker', () => {
  const chunker = new OparlChunker(splitText);

  it.each([
    ['date', { date: '2024-10-10' }],
    ['meeting', { meetingId: '6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e' as const }],
  ])(
    'chunks an agenda item again when only its %s changed, so its chunks do not keep the old one',
    (_field, change: Partial<OparlTextObject>) => {
      const before = chunker.objectChunks(agendaItem());
      const after = chunker.objectChunks(agendaItem(change));

      expect(after.hash).not.toBe(before.hash);
    },
  );

  it('strips the HTML some systems put into resolution texts', () => {
    const { chunks } = chunker.objectChunks(
      agendaItem({
        parts: [
          '3.1 Kita',
          null,
          '<p>Die Gemeindevertretung <b>beschließt</b>.</p>',
        ],
      }),
    );

    expect(chunks[0].text).toBe('3.1 Kita\nDie Gemeindevertretung beschließt.');
  });
});
