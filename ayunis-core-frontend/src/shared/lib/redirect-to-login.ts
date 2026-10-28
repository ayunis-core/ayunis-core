import { currentPathWithSearch } from './current-path-with-search';

type LoginRedirectLocation = Pick<Location, 'pathname' | 'search' | 'replace'>;

export function redirectToLogin(
  location: LoginRedirectLocation = window.location,
): void {
  const search = new URLSearchParams({
    redirect: currentPathWithSearch(location),
  });
  location.replace(`/login?${search.toString()}`);
}
