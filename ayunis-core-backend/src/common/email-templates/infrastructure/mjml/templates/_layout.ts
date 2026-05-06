/**
 * Shared MJML layout used by all redesigned transactional emails.
 *
 * Renders: logo header → optional banner → white card body → footer with
 * recipient address, support contact and legal links.
 *
 * Image URLs are passed in absolute form (built by the use case from
 * `FRONTEND_BASEURL` + `/email/...`) so the resulting HTML is self-contained.
 */

export const COLOR = {
  brand: '#7C5CFF',
  text: '#1f2937',
  body: '#4b5563',
  muted: '#6b7280',
  hairline: '#e5e7eb',
  bg: '#f5f5f7',
  card: '#ffffff',
  softBrand: '#f3f1ff',
};

export interface LayoutOptions {
  title: string;
  preheader: string;
  logoUrl: string;
  bannerUrl?: string | null;
  bannerAlt?: string;
  bodyMjml: string;
  footerEmail: string;
  currentYear: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export function renderLayout(options: LayoutOptions): string {
  const {
    title,
    preheader,
    logoUrl,
    bannerUrl,
    bannerAlt,
    bodyMjml,
    footerEmail,
    currentYear,
    privacyUrl = 'https://www.ayunis.com/datenschutz-core',
    termsUrl = 'https://www.ayunis.com/agb-software-%c3%bcberlassung',
  } = options;

  const bannerSection = bannerUrl
    ? `<mj-section background-color="${COLOR.card}" padding="16px 32px 0 32px">
         <mj-column>
           <mj-image src="${bannerUrl}" alt="${escapeAttr(bannerAlt ?? '')}" width="496px" border-radius="10px" padding="0" />
         </mj-column>
       </mj-section>`
    : '';

  return `
<mjml>
  <mj-head>
    <mj-title>${escapeText(title)}</mj-title>
    <mj-preview>${escapeText(preheader)}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" />
      <mj-text font-weight="400" font-size="16px" color="${COLOR.body}" line-height="1.6" />
      <mj-button background-color="${COLOR.brand}" color="#ffffff" font-size="15px" font-weight="600" border-radius="8px" padding="4px 0" text-align="left" inner-padding="10px 18px" />
    </mj-attributes>
    <mj-style inline="inline">
      a { color: ${COLOR.brand}; text-decoration: underline; }
    </mj-style>
  </mj-head>

  <mj-body background-color="${COLOR.bg}" width="560px">

    <mj-section padding="32px 0 0 0">
      <mj-column><mj-spacer height="1px" /></mj-column>
    </mj-section>

    <mj-section background-color="${COLOR.card}" border-radius="14px 14px 0 0" padding="32px 32px 8px 32px">
      <mj-column>
        <mj-image src="${logoUrl}" alt="Ayunis Core" width="130px" align="left" padding="0" />
      </mj-column>
    </mj-section>

    ${bannerSection}

    <mj-section background-color="${COLOR.card}" border-radius="0 0 14px 14px" padding="24px 32px 40px 32px">
      <mj-column>
        ${bodyMjml}
      </mj-column>
    </mj-section>

    <mj-section padding="24px 32px 40px 32px">
      <mj-column>
        <mj-text align="center" color="${COLOR.muted}" font-size="13px" padding-bottom="6px">
          Diese E-Mail wurde an <strong>${escapeText(footerEmail)}</strong> gesendet.
        </mj-text>
        <mj-text align="center" color="${COLOR.muted}" font-size="13px" padding-bottom="14px">
          Fragen? Schreiben Sie uns an <a href="mailto:help@ayunis.com">help@ayunis.com</a>
        </mj-text>
        <mj-text align="center" color="#9ca3af" font-size="12px">
          © ${escapeText(currentYear)} Ayunis GmbH · <a href="${privacyUrl}" style="color:#9ca3af;">Datenschutz</a> · <a href="${termsUrl}" style="color:#9ca3af;">AGB</a>
        </mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>`;
}

// ---------------------------------------------------------------------------
// Body-builder helpers — reusable mj-component snippets
// ---------------------------------------------------------------------------

export function h1(text: string): string {
  return `<mj-text font-size="24px" font-weight="700" color="${COLOR.text}" align="left" padding="0 0 12px 0" line-height="1.3">${text}</mj-text>`;
}

export function p(text: string): string {
  return `<mj-text font-size="16px" color="${COLOR.body}" align="left" padding="0 0 16px 0">${text}</mj-text>`;
}

export function cta(label: string, href: string): string {
  return `<mj-button href="${href}" align="left" padding="4px 0">${label}</mj-button>`;
}

export function ctaGhost(label: string, href: string): string {
  return `<mj-button href="${href}" align="left" padding="4px 0" background-color="${COLOR.softBrand}" color="${COLOR.brand}" font-size="14px" font-weight="600" border-radius="8px" inner-padding="10px 18px">${label}</mj-button>`;
}

export function fineprint(text: string): string {
  return `<mj-text font-size="13px" color="${COLOR.muted}" align="left" padding="12px 0 0 0">${text}</mj-text>`;
}

export function divider(): string {
  return `<mj-divider border-color="${COLOR.hairline}" border-width="1px" padding="24px 0" />`;
}

export function teamSignoff(teamUrl: string): string {
  return `
    <mj-spacer height="8px" />
    <mj-image src="${teamUrl}" alt="Das Ayunis-Team" width="126px" align="left" padding="0" />
    <mj-text font-size="14px" color="${COLOR.text}" font-weight="600" align="left" padding="12px 0 0 0">Ihr Ayunis-Team</mj-text>
  `;
}

export function promptBubble(text: string): string {
  return `<mj-text font-size="15px" color="${COLOR.text}" align="left" padding="0" line-height="1.6">
    <span style="display:block; padding:16px 18px; background:${COLOR.softBrand}; border-radius:16px;">${text}</span>
  </mj-text>`;
}

export function sectionHeading(eyebrow: string, title: string): string {
  const eyebrowMarkup = eyebrow
    ? `<mj-text font-size="13px" color="${COLOR.brand}" font-weight="700" align="left" padding="0 0 4px 0" letter-spacing="0.04em">${eyebrow}</mj-text>`
    : '';
  return `${eyebrowMarkup}
    <mj-text font-size="20px" font-weight="700" color="${COLOR.text}" align="left" padding="0 0 12px 0" line-height="1.3">${title}</mj-text>`;
}

export function useCaseRow(
  iconUrl: string,
  title: string,
  description: string,
): string {
  return `<mj-text font-size="15px" color="${COLOR.body}" align="left" padding="0 0 16px 0" line-height="1.55">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
      <td style="width:48px; vertical-align:top; padding-right:14px;">
        <div style="width:40px; height:40px; border-radius:10px; background:${COLOR.softBrand}; text-align:center; line-height:40px;">
          <img src="${iconUrl}" alt="" width="22" height="22" style="vertical-align:middle; display:inline-block; border:0;" />
        </div>
      </td>
      <td style="vertical-align:top;">
        <div style="font-weight:700; color:${COLOR.text}; padding-bottom:2px;">${escapeText(title)}</div>
        <div>${description}</div>
      </td>
    </tr></table>
  </mj-text>`;
}

// ---------------------------------------------------------------------------
// HTML escaping for values that go into attributes / text nodes
// ---------------------------------------------------------------------------

function escapeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(input: string): string {
  return escapeText(input).replace(/"/g, '&quot;');
}
