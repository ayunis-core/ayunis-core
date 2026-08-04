import { describe, expect, it } from 'vitest';
import { currentPathWithSearch } from './current-path-with-search';

describe('currentPathWithSearch', () => {
  it('preserves an OAuth callback path and its complete query string', () => {
    expect(
      currentPathWithSearch({
        pathname: '/settings/integrations/oauth/callback',
        search: '?state=opaque&code=one-time&iss=https%3A%2F%2Fissuer.example',
      }),
    ).toBe(
      '/settings/integrations/oauth/callback?state=opaque&code=one-time&iss=https%3A%2F%2Fissuer.example',
    );
  });
});
