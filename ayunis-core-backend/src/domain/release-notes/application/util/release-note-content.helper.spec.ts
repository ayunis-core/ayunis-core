import {
  anAnnouncableNote,
  TEST_IMAGE_PATH,
  TEST_IMAGE_SRC,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import {
  imageSourcePath,
  releaseNoteText,
} from './release-note-content.helper';

describe('releaseNoteText', () => {
  it('takes the headline from the title and the body from the text', () => {
    expect(
      releaseNoteText(
        anAnnouncableNote({
          title: ' Tabellen direkt in Ayunis Core erstellen ',
          text: 'Ab sofort können Sie Tabellen im Chat erstellen.\r\n',
        }),
      ),
    ).toEqual({
      headline: 'Tabellen direkt in Ayunis Core erstellen',
      body: 'Ab sofort können Sie Tabellen im Chat erstellen.',
    });
  });

  it('ends the body with the call to action as a markdown link', () => {
    const text = releaseNoteText(
      anAnnouncableNote({
        text: 'Es gibt mehrere Termine zur Auswahl.',
        ctaLabelOverride: 'Zur Anmeldung',
        ctaHrefOverride:
          'https://app.livestorm.co/locaboo/ayunis-core-einstieg',
      }),
    );

    expect(text).toMatchObject({
      body: 'Es gibt mehrere Termine zur Auswahl.\n\n[Zur Anmeldung](https://app.livestorm.co/locaboo/ayunis-core-einstieg)',
    });
  });

  it('labels a call to action without a label "Mehr erfahren"', () => {
    const text = releaseNoteText(
      anAnnouncableNote({
        text: 'Arbeitsbereiche erleichtern Ihnen die Arbeit.',
        ctaHrefOverride: 'https://help.ayunis.com/de/workspaces/',
      }),
    );

    expect(text).toMatchObject({
      body: 'Arbeitsbereiche erleichtern Ihnen die Arbeit.\n\n[Mehr erfahren](https://help.ayunis.com/de/workspaces/)',
    });
  });

  it('keeps brackets in the label and parentheses in the URL from breaking the link', () => {
    const text = releaseNoteText(
      anAnnouncableNote({
        text: 'Mehr dazu in der Hilfe.',
        ctaLabelOverride: 'Hilfe [neu]',
        ctaHrefOverride: 'https://help.ayunis.com/de/chat_(neu)/',
      }),
    );

    expect(text).toMatchObject({
      body: 'Mehr dazu in der Hilfe.\n\n[Hilfe \\[neu\\]](https://help.ayunis.com/de/chat_%28neu%29/)',
    });
  });

  it.each([
    ['a script URL', 'javascript:alert(1)'],
    ['a relative path', '/de/workspaces/'],
  ])('leaves out a call to action with %s', (_label, href) => {
    expect(
      releaseNoteText(
        anAnnouncableNote({ text: 'Ab sofort neu.', ctaHrefOverride: href }),
      ),
    ).toMatchObject({ body: 'Ab sofort neu.' });
  });

  it.each([
    ['an empty title', { title: '  ' }],
    ['a title longer than a notification headline', { title: 'A'.repeat(201) }],
    ['neither text nor link', { text: ' ', ctaHrefOverride: '' }],
    ['a body longer than a notification body', { text: 'A'.repeat(10_001) }],
  ])('rejects a note with %s', (_label, overrides) => {
    expect(releaseNoteText(anAnnouncableNote(overrides))).toEqual({
      violation: expect.any(String),
    });
  });
});

describe('imageSourcePath', () => {
  it('drops the expiring signature', () => {
    expect(imageSourcePath(TEST_IMAGE_SRC)).toBe(TEST_IMAGE_PATH);
  });

  it('has no path for a value that is not a URL', () => {
    expect(imageSourcePath('cb6b6d9a/ba4574f9.webp')).toBeNull();
  });
});
