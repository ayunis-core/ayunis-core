import { buildCertificateHtml } from './certificate-template';

describe('buildCertificateHtml', () => {
  it('names the completed course KI-Schulung nach EU AI Act', () => {
    const html = buildCertificateHtml({
      userName: 'Käthe Müller',
      dateLine: '15. Juli 2026, München',
    });

    expect(html).toContain(
      'die <strong>Ayunis Core KI-Schulung nach EU AI Act</strong> erfolgreich',
    );
  });
});
