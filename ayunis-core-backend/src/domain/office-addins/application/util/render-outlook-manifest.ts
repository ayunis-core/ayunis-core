import { outlookAddinId } from './outlook-addin-id';

// Outlook and the Microsoft 365 admin center only apply a manifest update
// whose version is higher than the installed one: bump on every change.
export const OUTLOOK_MANIFEST_VERSION = '1.0.3';

// Served by the frontend build (ayunis-core-frontend/outlook and
// public/outlook). Outlook on the web shows the task pane in an iframe, so
// these files must stay frameable by it.
const OUTLOOK_ADDIN_PATH = '/outlook';

// Each button gets its own task pane URL so the pane can serve read and
// compose differently without a manifest change, which admins would have to
// redeploy.
type CommandSurface = 'messageRead' | 'messageCompose';

const COMMAND_SURFACES: { surface: CommandSurface; extensionPoint: string }[] =
  [
    { surface: 'messageRead', extensionPoint: 'MessageReadCommandSurface' },
    {
      surface: 'messageCompose',
      extensionPoint: 'MessageComposeCommandSurface',
    },
  ];

// Ribbon buttons use 16, 32 and 80; the add-in itself 64 and 128.
const ICON_SIZES = [16, 32, 64, 80, 128];

// Registered once, so later features can ship through the code served at our
// URLs instead of a manifest every tenant admin must redeploy:
// - Each handler is named after its event, not after the feature using it.
//   The event runtime (frontend `src/outlook/events.ts` and
//   `public/outlook/events-classic.js`) registers every name and completes
//   the event at once unless a feature handles it.
// - An event added here appears in the admin center's update wizard and
//   takes effect only after an admin consents to the update.
// - Send events (OnMessageSend, OnAppointmentSend) can block sending, so
//   they are not registered without a deliberate decision.
const LAUNCH_EVENTS = [
  'OnMessageCompose',
  'OnMessageRecipientsChanged',
  'OnMessageAttachmentsChanged',
  'OnMessageFromChanged',
  'OnInfoBarDismissClicked',
];

interface AddinUrls {
  icon(size: number): string;
  taskpane(surface: CommandSurface, withManifestVersion: boolean): string;
  eventsRuntime: string;
  classicEventsRuntime: string;
}

export function renderOutlookManifest(frontendBaseUrl: string): string {
  const baseUrl = withoutTrailingSlashes(frontendBaseUrl);
  const urls = addinUrls(baseUrl);
  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.0"
  xsi:type="MailApp">
  <Id>${outlookAddinId(baseUrl)}</Id>
  <Version>${OUTLOOK_MANIFEST_VERSION}</Version>
  <ProviderName>Ayunis</ProviderName>
  <DefaultLocale>de-DE</DefaultLocale>
  <DisplayName DefaultValue="Ayunis Core für Outlook">
    <Override Locale="en-US" Value="Ayunis Core for Outlook"/>
  </DisplayName>
  <Description DefaultValue="Ihr KI-Assistent Ayunis Core direkt in Outlook.">
    <Override Locale="en-US" Value="Your Ayunis Core AI assistant, right inside Outlook."/>
  </Description>
  <IconUrl DefaultValue="${urls.icon(64)}"/>
  <HighResolutionIconUrl DefaultValue="${urls.icon(128)}"/>
  <SupportUrl DefaultValue="https://help.ayunis.com"/>
${indent(mailAppSettings(urls), 2)}
${indent(versionOverrides(urls), 2)}
</OfficeApp>
`;
}

function mailAppSettings(urls: AddinUrls): string {
  return `<Hosts>
  <Host Name="Mailbox"/>
</Hosts>
<Requirements>
  <Sets>
    <Set Name="Mailbox" MinVersion="1.1"/>
  </Sets>
</Requirements>
<FormSettings>
  <Form xsi:type="ItemRead">
    <DesktopSettings>
      <SourceLocation DefaultValue="${urls.taskpane('messageRead', false)}"/>
      <RequestedHeight>250</RequestedHeight>
    </DesktopSettings>
  </Form>
</FormSettings>
<Permissions>ReadWriteItem</Permissions>
<Rule xsi:type="ItemIs" ItemType="Message" FormType="ReadOrEdit"/>`;
}

// Clients that understand VersionOverrides 1.1 ignore the 1.0 block; it stays
// for clients that only know 1.0. Pinning needs Mailbox 1.5, so only the 1.1
// block requires it. Exchange Server (on-premises) supports up to 1.5, so a
// higher minimum would hide the add-in there.
//
// SupportsSharedFolders takes effect from Mailbox 1.8 (shared folders) and
// 1.13 (shared mailboxes); clients below that show the add-in only in the
// user's own mailbox.
function versionOverrides(urls: AddinUrls): string {
  return `<VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
${indent(commandsRequirements('1.3'), 2)}
  <Hosts>
    <Host xsi:type="MailHost">
      <DesktopFormFactor>
${indent(extensionPoints({ withPinning: false }), 8)}
      </DesktopFormFactor>
    </Host>
  </Hosts>
${indent(resources(urls, { current: false }), 2)}
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides/1.1" xsi:type="VersionOverridesV1_1">
${indent(commandsRequirements('1.5'), 4)}
    <Hosts>
      <Host xsi:type="MailHost">
        <Runtimes>
          <Runtime resid="Events.Web">
            <Override type="javascript" resid="Events.Classic"/>
          </Runtime>
        </Runtimes>
        <DesktopFormFactor>
          <SupportsSharedFolders>true</SupportsSharedFolders>
${indent(extensionPoints({ withPinning: true }), 10)}
${indent(launchEvents(), 10)}
        </DesktopFormFactor>
      </Host>
    </Hosts>
${indent(resources(urls, { current: true }), 4)}
  </VersionOverrides>
</VersionOverrides>`;
}

function commandsRequirements(minVersion: string): string {
  return `<Requirements>
  <bt:Sets DefaultMinVersion="${minVersion}">
    <bt:Set Name="Mailbox"/>
  </bt:Sets>
</Requirements>`;
}

function extensionPoints({ withPinning }: { withPinning: boolean }): string {
  return COMMAND_SURFACES.map(({ surface, extensionPoint }) => {
    const pinning = withPinning
      ? '\n          <SupportsPinning>true</SupportsPinning>'
      : '';
    return `<ExtensionPoint xsi:type="${extensionPoint}">
  <OfficeTab id="TabDefault">
    <Group id="Ayunis.${surface}.Group">
      <Label resid="Group.Label"/>
      <Control xsi:type="Button" id="Ayunis.${surface}.Open">
        <Label resid="Button.Label"/>
        <Supertip>
          <Title resid="Button.Title"/>
          <Description resid="Button.Description"/>
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16"/>
          <bt:Image size="32" resid="Icon.32"/>
          <bt:Image size="80" resid="Icon.80"/>
        </Icon>
        <Action xsi:type="ShowTaskpane">
          <SourceLocation resid="Taskpane.${surface}"/>${pinning}
        </Action>
      </Control>
    </Group>
  </OfficeTab>
</ExtensionPoint>`;
  }).join('\n');
}

function launchEvents(): string {
  const events = LAUNCH_EVENTS.map(
    (type) =>
      `<LaunchEvent Type="${type}" FunctionName="${handlerName(type)}"/>`,
  ).join('\n');
  return `<ExtensionPoint xsi:type="LaunchEvent">
  <LaunchEvents>
${indent(events, 4)}
  </LaunchEvents>
  <SourceLocation resid="Events.Web"/>
</ExtensionPoint>`;
}

function handlerName(eventType: string): string {
  return eventType.charAt(0).toLowerCase() + eventType.slice(1);
}

// Only clients that read VersionOverrides 1.1 can run the launch events, so
// only its pane URLs carry the manifest version. Features check a minimum
// version instead of each adding its own URL flag.
function resources(urls: AddinUrls, { current }: { current: boolean }): string {
  const images = ICON_SIZES.map(
    (size) => `<bt:Image id="Icon.${size}" DefaultValue="${urls.icon(size)}"/>`,
  ).join('\n');
  const taskpanes = COMMAND_SURFACES.map(
    ({ surface }) =>
      `<bt:Url id="Taskpane.${surface}" DefaultValue="${urls.taskpane(surface, current)}"/>`,
  );
  const eventsUrls = current
    ? [
        `<bt:Url id="Events.Web" DefaultValue="${urls.eventsRuntime}"/>`,
        `<bt:Url id="Events.Classic" DefaultValue="${urls.classicEventsRuntime}"/>`,
      ]
    : [];
  return `<Resources>
  <bt:Images>
${indent(images, 4)}
  </bt:Images>
  <bt:Urls>
${indent([...taskpanes, ...eventsUrls].join('\n'), 4)}
  </bt:Urls>
  <bt:ShortStrings>
    <bt:String id="Group.Label" DefaultValue="Ayunis Core"/>
    <bt:String id="Button.Label" DefaultValue="Ayunis Core"/>
    <bt:String id="Button.Title" DefaultValue="Ayunis Core öffnen">
      <bt:Override Locale="en-US" Value="Open Ayunis Core"/>
    </bt:String>
  </bt:ShortStrings>
  <bt:LongStrings>
    <bt:String id="Button.Description" DefaultValue="Öffnet Ayunis Core im Seitenbereich.">
      <bt:Override Locale="en-US" Value="Opens Ayunis Core in the side pane."/>
    </bt:String>
  </bt:LongStrings>
</Resources>`;
}

function addinUrls(baseUrl: string): AddinUrls {
  const addinBaseUrl = escapeXmlAttribute(`${baseUrl}${OUTLOOK_ADDIN_PATH}`);
  return {
    icon: (size) => `${addinBaseUrl}/assets/icon-${size}.png`,
    taskpane: (surface, withManifestVersion) => {
      const manifestVersion = withManifestVersion
        ? `&amp;manifestVersion=${OUTLOOK_MANIFEST_VERSION}`
        : '';
      return `${addinBaseUrl}/taskpane.html?surface=${surface}${manifestVersion}`;
    },
    eventsRuntime: `${addinBaseUrl}/events.html`,
    classicEventsRuntime: `${addinBaseUrl}/events-classic.js`,
  };
}

function withoutTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end--;
  return url.slice(0, end);
}

function indent(xml: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return xml
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
