import { releaseNotesConfig } from './release-notes.config';

describe('releaseNotesConfig', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([undefined, '', '  '])(
    'has no Announcable org ID when it is unset or blank (%p)',
    (value) => {
      process.env = { ...original, ANNOUNCABLE_ORG_ID: value };
      if (value === undefined) delete process.env.ANNOUNCABLE_ORG_ID;

      expect(releaseNotesConfig().announcableOrgId).toBeNull();
    },
  );

  it('reads the Announcable org ID', () => {
    process.env = {
      ...original,
      ANNOUNCABLE_ORG_ID: ' bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154 ',
    };

    expect(releaseNotesConfig().announcableOrgId).toBe(
      'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154',
    );
  });

  it.each([undefined, '', '  '])(
    'reads release notes from Announcable when no other URL is set (%p)',
    (value) => {
      process.env = { ...original, ANNOUNCABLE_URL: value };
      if (value === undefined) delete process.env.ANNOUNCABLE_URL;

      expect(releaseNotesConfig().announcableOrigin).toBe(
        'https://release-notes.locaboo.de',
      );
    },
  );

  it('reads release notes from another Announcable URL', () => {
    process.env = { ...original, ANNOUNCABLE_URL: ' http://127.0.0.1:3198/ ' };

    expect(releaseNotesConfig().announcableOrigin).toBe(
      'http://127.0.0.1:3198',
    );
  });
});
