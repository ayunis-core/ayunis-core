import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { emailConfirmationHtml } from './email-confirmation.template';

describe('email confirmation template', () => {
  it('renders an MJML include payload in an email address as inert text', () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'ayunis-mjml-'));
    const fixturePath = join(fixtureDirectory, 'include.html');
    const includedMarker = 'AYUNIS_MJML_INCLUDE_MUST_NOT_RENDER';
    writeFileSync(fixturePath, includedMarker);

    try {
      const maliciousEmail = `"</mj-text><mj-include type=html path=${fixturePath}>"@x.io`;
      const rendered = emailConfirmationHtml({
        confirmationUrl: 'https://app.ayunis.test/confirm?token=safe-token',
        userEmail: maliciousEmail,
        currentYear: '2026',
        companyName: 'Ayunis',
      });

      expect(rendered.html).not.toContain(includedMarker);
      expect(rendered.html).toContain('&lt;/mj-text&gt;');
    } finally {
      rmSync(fixtureDirectory, { recursive: true, force: true });
    }
  });
});
