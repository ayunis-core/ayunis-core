import { parseSharePointUrl } from './sharepoint-url';

const HOST = 'stadt-musterhausen.sharepoint.com';

describe('parseSharePointUrl', () => {
  it.each([
    ['a site', `https://${HOST}/sites/bauamt`, 'sites/bauamt', []],
    [
      "a site's home page",
      `https://${HOST}/sites/bauamt/SitePages/Home.aspx`,
      'sites/bauamt',
      [],
    ],
    ['a Teams site', `https://${HOST}/teams/rathaus/`, 'teams/rathaus', []],
    [
      'a library view',
      `https://${HOST}/sites/bauamt/Freigegebene%20Dokumente/Forms/AllItems.aspx`,
      'sites/bauamt',
      ['Freigegebene Dokumente'],
    ],
    [
      'a folder',
      `https://${HOST}/sites/bauamt/Freigegebene%20Dokumente/Umlaute%20%26%20Sonderzeichen`,
      'sites/bauamt',
      ['Freigegebene Dokumente', 'Umlaute & Sonderzeichen'],
    ],
    [
      'a folder shown in a library view',
      `https://${HOST}/sites/bauamt/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fsites%2Fbauamt%2FFreigegebene%20Dokumente%2FSatzungen&viewid=0b8a7d11`,
      'sites/bauamt',
      ['Freigegebene Dokumente', 'Satzungen'],
    ],
    [
      'a link to a folder by its path',
      `https://${HOST}/:f:/r/sites/bauamt/Freigegebene%20Dokumente/Satzungen?csf=1&web=1`,
      'sites/bauamt',
      ['Freigegebene Dokumente', 'Satzungen'],
    ],
    [
      'a library of the root site',
      `https://${HOST}/Shared%20Documents`,
      '',
      ['Shared Documents'],
    ],
  ])('splits %s into site and path', (_case, url, sitePath, path) => {
    expect(parseSharePointUrl(url)).toEqual({ host: HOST, sitePath, path });
  });

  it.each([
    ['a sharing link', `https://${HOST}/:f:/s/bauamt/EsT2xQ`],
    ['another host', 'https://intranet.musterhausen.de/sites/bauamt'],
    ['plain http', `http://${HOST}/sites/bauamt`],
    ['no URL', 'Bauamt'],
  ])('refuses %s', (_case, url) => {
    expect(parseSharePointUrl(url)).toBeNull();
  });
});
