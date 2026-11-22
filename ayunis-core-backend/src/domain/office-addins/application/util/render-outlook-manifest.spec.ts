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

  // Every event added later shows up in the admin center's update wizard and
  // needs admin consent, so the installed set must not change by accident.
  it('registers the five launch events with handlers named after the event, only in VersionOverrides 1.1', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');
    const [legacy, current] = manifest.split('xsi:type="VersionOverridesV1_1"');

    const launchEvents = (xml: string) =>
      [
        ...xml.matchAll(/<LaunchEvent Type="(\w+)" FunctionName="(\w+)"\/>/g),
      ].map(([, type, functionName]) => ({ type, functionName }));

    expect(launchEvents(legacy)).toEqual([]);
    expect(launchEvents(current)).toEqual([
      { type: 'OnMessageCompose', functionName: 'onMessageCompose' },
      {
        type: 'OnMessageRecipientsChanged',
        functionName: 'onMessageRecipientsChanged',
      },
      {
        type: 'OnMessageAttachmentsChanged',
        functionName: 'onMessageAttachmentsChanged',
      },
      { type: 'OnMessageFromChanged', functionName: 'onMessageFromChanged' },
      {
        type: 'OnInfoBarDismissClicked',
        functionName: 'onInfoBarDismissClicked',
      },
    ]);
    expect(current).toMatch(
      /<Runtime resid="Events\.Web">\s*<Override type="javascript" resid="Events\.Classic"\/>/,
    );
    expect(current).toContain('<SourceLocation resid="Events.Web"/>');
    expect(current).toContain(
      '<bt:Url id="Events.Web" DefaultValue="https://app.ayunis.example/outlook/events.html"/>',
    );
    expect(current).toContain(
      '<bt:Url id="Events.Classic" DefaultValue="https://app.ayunis.example/outlook/events-classic.js"/>',
    );
  });

  // Features gate on the version in the pane URL. Clients that read the
  // legacy settings or the 1.0 block cannot run launch events, so their URLs
  // must not claim this version.
  it('marks only the VersionOverrides 1.1 pane URLs with the manifest version', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');
    const [legacy, current] = manifest.split('xsi:type="VersionOverridesV1_1"');

    const marked = (xml: string) =>
      urls(xml).filter((url) => url.includes('manifestVersion'));

    expect(marked(legacy)).toEqual([]);
    expect(marked(current)).toEqual([
      'https://app.ayunis.example/outlook/taskpane.html?surface=messageRead&amp;manifestVersion=1.0.3',
      'https://app.ayunis.example/outlook/taskpane.html?surface=messageCompose&amp;manifestVersion=1.0.3',
    ]);
  });

  // Admins see one entry per Office add-in in the admin center; a later Word
  // or Excel add-in must not show up under the same name.
  it('names the app after its host and the ribbon after the product', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');

    expect(manifest).toContain(
      '<DisplayName DefaultValue="Ayunis Core für Outlook">\n    <Override Locale="en-US" Value="Ayunis Core for Outlook"/>',
    );
    expect(manifest).toContain(
      '<bt:String id="Group.Label" DefaultValue="Ayunis Core"/>',
    );
    expect(manifest).toContain(
      '<bt:String id="Button.Label" DefaultValue="Ayunis Core"/>',
    );
  });

  it('names the add-in Ayunis Core in every string Outlook shows', () => {
    const manifest = renderOutlookManifest('https://app.ayunis.example');

    const texts = [
      ...manifest.matchAll(/(?:DefaultValue|Value)="([^"]*)"/g),
    ].map(([, text]) => text);
    const shown = texts.filter((text) => !/^https?:/.test(text));

    expect(shown).toEqual(
      expect.arrayContaining([
        'Ayunis Core für Outlook',
        'Ayunis Core for Outlook',
        'Ayunis Core',
        'Ayunis Core öffnen',
        'Open Ayunis Core',
        'Öffnet Ayunis Core im Seitenbereich.',
        'Opens Ayunis Core in the side pane.',
        'Ihr KI-Assistent Ayunis Core direkt in Outlook.',
        'Your Ayunis Core AI assistant, right inside Outlook.',
      ]),
    );
    for (const text of shown) {
      expect(text.replaceAll('Ayunis Core', '')).not.toMatch(/Ayunis/);
    }
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
