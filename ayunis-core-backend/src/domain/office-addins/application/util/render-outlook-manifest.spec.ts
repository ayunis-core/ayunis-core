import { renderOutlookManifest } from './render-outlook-manifest';

function addinId(manifest: string): string | undefined {
  return /<Id>([^<]+)<\/Id>/.exec(manifest)?.[1];
}

function urls(manifest: string): string[] {
  return [...manifest.matchAll(/DefaultValue="(https?:[^"]+)"/g)].map(
    ([, url]) => url,
  );
}

describe('renderOutlookManifest', () => {
  // Microsoft 365 treats a manifest with a new Id as a different add-in, so
  // changing how the Id is derived forces every tenant to redeploy.
  it('keeps the add-in id of a deployment stable across releases', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');

    expect(addinId(manifest)).toBe('99709215-2481-8df4-8101-31fd9f449a15');
  });

  it('gives each deployment its own add-in id so they can be installed side by side', () => {
    const production = renderOutlookManifest('https://app.ayunis.example');
    const staging = renderOutlookManifest('https://staging.ayunis.example');

    expect(addinId(staging)).not.toBe(addinId(production));
  });

  it('points the task panes and icons at the deployment it is served from', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example/');

    const addinUrls = urls(manifest).filter(
      (url) => url !== 'https://help.ayunis.com',
    );

    expect(addinUrls.length).toBeGreaterThan(0);
    for (const url of addinUrls) {
      expect(url).toMatch(/^https:\/\/app\.ayunis\.example\/outlook\/[^/]/);
    }
    expect(addinId(manifest)).toBe('99709215-2481-8df4-8101-31fd9f449a15');
  });

  // Exchange Server (2016, 2019, SE) stops at Mailbox 1.5 and hides add-ins
  // that require more.
  it('stays installable on Exchange Server on-premises', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');

    const minVersions = [
      ...manifest.matchAll(/(?:DefaultMinVersion|MinVersion)="([\d.]+)"/g),
    ].map(([, version]) => Number(version));

    expect(minVersions).toContain(1.5);
    for (const version of minVersions) {
      expect(version).toBeLessThanOrEqual(1.5);
    }
  });
});
