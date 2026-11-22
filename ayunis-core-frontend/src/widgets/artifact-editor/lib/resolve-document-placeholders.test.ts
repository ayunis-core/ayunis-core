import { describe, expect, it } from 'vitest';
import { resolveDocumentPlaceholders } from './resolve-document-placeholders';

describe('resolveDocumentPlaceholders', () => {
  it('shows a value with markup characters as text instead of turning it into markup', () => {
    expect(
      resolveDocumentPlaceholders(
        '<p>An {{pii:ORGANIZATION_1}} und {{pii:PERSON_NAME_9}}</p>',
        [
          {
            token: '{{pii:ORGANIZATION_1}}',
            value: 'Müller & Söhne <img src=x onerror=alert(1)>',
            category: 'organization',
          },
        ],
      ),
    ).toBe(
      '<p>An Müller &amp; Söhne &lt;img src=x onerror=alert(1)&gt; und {{pii:PERSON_NAME_9}}</p>',
    );
  });
});
