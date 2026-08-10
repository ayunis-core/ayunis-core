import { extractOrgIdFromKey, orgStoragePrefixes } from './org-storage-layout';

const ORG_ID = '11111111-1111-4111-8111-111111111111';

describe('org-storage-layout', () => {
  describe('orgStoragePrefixes', () => {
    it('builds every org-scoped prefix', () => {
      expect(orgStoragePrefixes(ORG_ID)).toEqual([
        `${ORG_ID}/`,
        `generated-images/${ORG_ID}/`,
        `letterheads/${ORG_ID}/`,
      ]);
    });
  });

  describe('extractOrgIdFromKey', () => {
    it('recovers the org id from a top-level key', () => {
      expect(extractOrgIdFromKey(`${ORG_ID}/thread/msg/0.png`)).toBe(ORG_ID);
    });

    it('recovers the org id from nested layouts', () => {
      expect(extractOrgIdFromKey(`generated-images/${ORG_ID}/img.png`)).toBe(
        ORG_ID,
      );
      expect(extractOrgIdFromKey(`letterheads/${ORG_ID}/head.pdf`)).toBe(
        ORG_ID,
      );
    });

    it('returns null for keys with no valid org uuid', () => {
      expect(extractOrgIdFromKey('not-a-uuid/file.png')).toBeNull();
      expect(
        extractOrgIdFromKey('generated-images/not-a-uuid/file.png'),
      ).toBeNull();
    });
  });

  it('round-trips: every built prefix maps back to its org id', () => {
    for (const prefix of orgStoragePrefixes(ORG_ID)) {
      expect(extractOrgIdFromKey(`${prefix}some/object.bin`)).toBe(ORG_ID);
    }
  });
});
