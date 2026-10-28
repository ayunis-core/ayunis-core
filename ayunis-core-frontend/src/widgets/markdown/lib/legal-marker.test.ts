import { describe, expect, it } from 'vitest';
import { parseLegalMarker, splitLegalMarkers } from './legal-marker';

const STATE_SCOPES = [
  'DE-BW',
  'DE-BY',
  'DE-BE',
  'DE-BB',
  'DE-HB',
  'DE-HH',
  'DE-HE',
  'DE-MV',
  'DE-NI',
  'DE-NW',
  'DE-RP',
  'DE-SL',
  'DE-SN',
  'DE-ST',
  'DE-SH',
  'DE-TH',
] as const;

describe('parseLegalMarker', () => {
  it('parses and formats a federal section with a paragraph', () => {
    expect(parseLegalMarker('{{legal:DE/BGB/sec_433/par_2}}')).toEqual({
      href: 'https://bundesrecht.online/BGB/433#Abs2',
      label: '§ 433 Abs. 2 BGB',
    });
  });

  it('parses and formats a state article', () => {
    expect(parseLegalMarker('{{legal:DE-BY/POG/art_1}}')).toEqual({
      href: 'https://landesrecht.online/BY/POG/1',
      label: 'Art. 1 POG',
    });
  });

  it.each(STATE_SCOPES)('accepts the supported state scope %s', (scope) => {
    const state = scope.slice(3);

    expect(parseLegalMarker(`{{legal:${scope}/Code1/sec_2a}}`)).toEqual({
      href: `https://landesrecht.online/${state}/Code1/2a`,
      label: '§ 2a Code1',
    });
  });

  it('preserves safe code casing and characters', () => {
    expect(parseLegalMarker('{{legal:DE/BImSchG_2-test/art_10b}}')).toEqual({
      href: 'https://bundesrecht.online/BImSchG_2-test/10b',
      label: 'Art. 10b BImSchG_2-test',
    });
  });

  it.each([
    '{{legal:DE-XX/POG/art_1}}',
    '{{legal:FR/BGB/sec_433}}',
    '{{legal:DE/BGB/chapter_2}}',
    '{{legal:DE/BGB/par_2/sec_433}}',
    '{{legal:DE/BGB/sec_433/par_2/item_1}}',
    '{{legal:DE/BGB/sec_0}}',
    '{{legal:DE/BGB/sec_01}}',
    '{{legal:DE/BGB/sec_1A}}',
    '{{legal:DE/BGB/sec_1/par_0}}',
    '{{legal:DE/BGB.de/sec_433}}',
    '{{legal:DE/BGB%2F..%2Fevil/sec_433}}',
    '{{legal:DE/BGB?next=evil/sec_433}}',
    '{{legal:DE/BGB/sec_433',
  ])('rejects the invalid marker %s', (marker) => {
    expect(parseLegalMarker(marker)).toBeNull();
  });
});

describe('splitLegalMarkers', () => {
  it('splits multiple valid markers while preserving surrounding text', () => {
    expect(
      splitLegalMarkers(
        'Nach {{legal:DE/BGB/sec_433}} und {{legal:DE-BY/POG/art_1}}.',
      ),
    ).toEqual([
      { kind: 'text', text: 'Nach ' },
      {
        kind: 'reference',
        reference: {
          href: 'https://bundesrecht.online/BGB/433',
          label: '§ 433 BGB',
        },
      },
      { kind: 'text', text: ' und ' },
      {
        kind: 'reference',
        reference: {
          href: 'https://landesrecht.online/BY/POG/1',
          label: 'Art. 1 POG',
        },
      },
      { kind: 'text', text: '.' },
    ]);
  });

  it('leaves unsupported markers literal', () => {
    const text = 'Siehe {{legal:DE-XX/POG/art_1}}.';

    expect(splitLegalMarkers(text)).toEqual([{ kind: 'text', text }]);
  });
});
