import { normalizeOparlSystemUrl } from './oparl-system-url';

/* eslint-disable sonarjs/no-clear-text-protocols -- These literals exercise the scheme check. */

describe('normalizeOparlSystemUrl', () => {
  it('gives variants of the same URL one form, so a duplicate is recognized', () => {
    const forms = [
      'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system',
      ' https://RIM.ekom21.de:443/aarbergen/webservice/oparl/v1.1/system/ ',
      'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system#top',
    ].map(normalizeOparlSystemUrl);
    expect(new Set(forms)).toEqual(
      new Set(['https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system']),
    );
  });

  it('keeps the query and the case of the path', () => {
    expect(normalizeOparlSystemUrl('http://ris.example.de/OParl?body=1')).toBe(
      'http://ris.example.de/OParl?body=1',
    );
  });

  it.each([
    'ftp://ris.example.de/system',
    'not a url',
    'https://user:pw@ris.example.de/',
  ])('rejects %s', (url) => {
    expect(normalizeOparlSystemUrl(url)).toBeNull();
  });
});
