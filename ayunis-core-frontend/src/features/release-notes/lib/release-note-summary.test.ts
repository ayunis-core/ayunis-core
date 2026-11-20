import { describe, expect, it } from 'vitest';
import { releaseNoteSummary } from './release-note-summary';

describe('releaseNoteSummary', () => {
  it('turns the markdown of a release note into one line of plain text', () => {
    expect(
      releaseNoteSummary(
        '## Neu\n\n**Auto** und _Max_ Modus:\n\n- schneller starten\n- `Auto` wählt das Modell\n\n[Mehr erfahren](https://ayunis.com/auto)',
      ),
    ).toBe(
      'Neu Auto und _Max_ Modus: schneller starten Auto wählt das Modell Mehr erfahren',
    );
  });

  it('drops images and keeps a note without markdown as it is', () => {
    expect(releaseNoteSummary('![Bild](https://a.de/b.png)\nNur Text.')).toBe(
      'Nur Text.',
    );
  });

  it('cuts a long body', () => {
    const summary = releaseNoteSummary('Wort '.repeat(200));

    expect(summary).toHaveLength(300);
    expect(summary.endsWith('…')).toBe(true);
  });
});
