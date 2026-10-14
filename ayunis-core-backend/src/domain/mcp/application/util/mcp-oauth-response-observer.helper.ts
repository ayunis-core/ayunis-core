export type McpOAuthRequestStage =
  | 'resource discovery'
  | 'authorization-server discovery'
  | 'client registration'
  | 'token exchange';

export interface ObservedOAuthResponse {
  stage: McpOAuthRequestStage;
  status: number;
  contentType?: string;
}

export interface McpOAuthResponseObserver {
  fetch: typeof fetch;
  lastResponse(): ObservedOAuthResponse | undefined;
  invalidResponse(): ObservedOAuthResponse | undefined;
}

/**
 * Wraps the guarded OAuth fetch so a parse failure inside the SDK can be
 * attributed to the request that produced it. Only the stage, status and
 * media type are kept: URLs and bodies may carry client secrets or tokens.
 */
export function observeOAuthResponses(
  fetchFn: typeof fetch,
): McpOAuthResponseObserver {
  let last: ObservedOAuthResponse | undefined;
  let invalid: ObservedOAuthResponse | undefined;
  const observed: typeof fetch = async (input, init) => {
    last = undefined;
    invalid = undefined;
    const response = await fetchFn(input, init);
    last = {
      stage: classifyOAuthRequest(input, init),
      status: response.status,
      contentType: mediaType(response.headers.get('content-type')),
    };
    if (!response.ok && !isMissingMetadata(last)) {
      const diagnostics = last;
      observeErrorBody(response, () => {
        invalid = diagnostics;
      });
    }
    return response;
  };
  return {
    fetch: observed,
    lastResponse: () => last,
    invalidResponse: () => invalid,
  };
}

// Observe the same text read the SDK already performs: clones would buffer
// another copy, and throwing here would prevent its discovery fallbacks.
function observeErrorBody(response: Response, onInvalid: () => void): void {
  const readText = response.text.bind(response);
  response.text = async () => {
    const body = await readText();
    try {
      JSON.parse(body);
    } catch {
      onInvalid();
    }
    return body;
  };
}

function isMissingMetadata(response: ObservedOAuthResponse): boolean {
  return response.status === 404 && response.stage.endsWith('discovery');
}

function classifyOAuthRequest(
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
): McpOAuthRequestStage {
  const pathname = requestPathname(input);
  if (pathname.includes('/.well-known/oauth-protected-resource')) {
    return 'resource discovery';
  }
  if (pathname.includes('/.well-known/')) {
    return 'authorization-server discovery';
  }
  if (init?.body instanceof URLSearchParams && init.body.has('grant_type')) {
    return 'token exchange';
  }
  return 'client registration';
}

function requestPathname(input: Parameters<typeof fetch>[0]): string {
  if (input instanceof URL) return input.pathname;
  const raw = input instanceof Request ? input.url : input;
  try {
    return new URL(raw).pathname;
  } catch {
    return '';
  }
}

function mediaType(header: string | null): string | undefined {
  const value = header?.split(';')[0]?.trim().toLowerCase();
  return value || undefined;
}
