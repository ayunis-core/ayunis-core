import type { ConfigService } from '@nestjs/config';

const ORG_OAUTH_REDIRECT_PATH = '/admin-settings/integrations';
const USER_OAUTH_REDIRECT_PATH = '/settings/integrations';
const RELATIVE_REDIRECT_BASE_URL = 'https://frontend.local';

export function buildFrontendRedirectUrl(args: {
  configService: ConfigService;
  returnPath: string | null;
  level: 'org' | 'user' | null;
  params: Record<string, string>;
}): string {
  const { configService, returnPath, level, params } = args;
  const frontendBaseUrl =
    configService.get<string>('app.frontend.baseUrl') ?? '';
  const frontendUrl = new URL(frontendBaseUrl);
  const safePath =
    sanitizeFrontendRedirectPath(returnPath) ??
    getDefaultFrontendRedirectPath(level);
  const targetUrl = new URL(safePath, frontendUrl);

  Object.entries(params).forEach(([key, value]) => {
    targetUrl.searchParams.set(key, value);
  });

  return targetUrl.toString();
}

export function sanitizeFrontendRedirectPath(
  returnPath: string | null | undefined,
): string | null {
  if (!returnPath?.startsWith('/')) {
    return null;
  }

  if (returnPath.startsWith('//')) {
    return null;
  }

  try {
    const parsedPath = new URL(returnPath, RELATIVE_REDIRECT_BASE_URL);
    if (parsedPath.origin !== RELATIVE_REDIRECT_BASE_URL) {
      return null;
    }

    return `${parsedPath.pathname}${parsedPath.search}`;
  } catch {
    return null;
  }
}

function getDefaultFrontendRedirectPath(level: 'org' | 'user' | null): string {
  return level === 'user' ? USER_OAUTH_REDIRECT_PATH : ORG_OAUTH_REDIRECT_PATH;
}
