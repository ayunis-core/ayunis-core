import { buildCertificateHtml } from './certificate-template';

describe('buildCertificateHtml', () => {
  it('renders a participation confirmation without exam terminology', () => {
    const html = buildCertificateHtml({
      userName: 'Käthe Müller',
      dateLine: '15. Juli 2026, München',
    });

    expect(html).toContain('TEILNAHMEBEST&Auml;TIGUNG');
    expect(html).toContain(
      'an der <strong>Ayunis Core KI-Schulung nach EU AI Act</strong>',
    );
    expect(html).toContain('erfolgreich teilgenommen hat');
    expect(html).not.toContain('Pr&uuml;fung');
    expect(html).not.toContain('ZERTIFIKAT');
  });
});
