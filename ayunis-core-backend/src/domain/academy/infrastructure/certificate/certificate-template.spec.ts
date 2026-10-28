import { buildCertificateHtml } from './certificate-template';

describe('buildCertificateHtml', () => {
  it('confirms participation in the KI-Schulung nach EU AI Act', () => {
    const html = buildCertificateHtml({
      userName: 'Käthe Müller',
      dateLine: '15.07.2026, München',
    });

    expect(html).toContain('Teilnahmebest&auml;tigung');
    expect(html).toContain(
      'an der <strong>Ayunis Core KI-Schulung nach EU AI Act</strong>',
    );
    expect(html).toContain('teilgenommen hat.');
  });
});
