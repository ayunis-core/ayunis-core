import { describe, expect, it } from 'vitest';
import { outlookManifestUrl } from './outlook-manifest-url';

describe('outlookManifestUrl', () => {
  it('resolves the API path of a production build against the app origin', () => {
    expect(outlookManifestUrl('/api', 'https://ayunis.example.de')).toBe(
      'https://ayunis.example.de/api/office-addins/outlook/manifest.xml',
    );
  });

  it('keeps an absolute API address as it is', () => {
    expect(
      outlookManifestUrl('http://localhost:3010/api', 'http://localhost:3011'),
    ).toBe('http://localhost:3010/api/office-addins/outlook/manifest.xml');
  });
});
