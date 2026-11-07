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

      expect(releaseNotesConfig()).toEqual({ announcableOrgId: null });
    },
  );

  it('reads the Announcable org ID', () => {
    process.env = {
      ...original,
      ANNOUNCABLE_ORG_ID: ' bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154 ',
    };

    expect(releaseNotesConfig()).toEqual({
      announcableOrgId: 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154',
    });
  });
});
