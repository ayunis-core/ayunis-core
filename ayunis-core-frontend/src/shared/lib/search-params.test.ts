import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route as AdminUsersRoute } from '@/app/routes/_authenticated/admin-settings.users';
import { Route as ChatRoute } from '@/app/routes/_authenticated/chat.index';
import { Route as OrgsRoute } from '@/app/routes/_authenticated/super-admin-settings.orgs.index';

type Validator = { parse: (input: unknown) => unknown };

function validate(
  route: { options: { validateSearch?: unknown } },
  url: string,
) {
  return (route.options.validateSearch as Validator).parse(
    defaultParseSearch(url),
  );
}

describe('route search params from hand-written URLs', () => {
  it('keeps an all-digit free-text search as text', () => {
    expect(
      validate(AdminUsersRoute, '?search=4711&invitesSearch=1793887122598'),
    ).toMatchObject({ search: '4711', invitesSearch: '1793887122598' });
    expect(validate(OrgsRoute, '?search=2026')).toMatchObject({
      search: '2026',
    });
  });

  it('keeps a boolean-looking value as text', () => {
    expect(validate(ChatRoute, '?prompt=true')).toMatchObject({
      prompt: 'true',
    });
  });
});
