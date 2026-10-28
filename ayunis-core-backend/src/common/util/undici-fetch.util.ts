import { fetch, type Response as UndiciResponse } from 'undici';

/**
 * Fetches through a dispatcher created from the `undici` dependency. Node's
 * built-in fetch runs on its embedded undici, whose handler API breaks across
 * majors when handed a dispatcher from this package, so the two must not mix.
 *
 * The result is copied into a global `Response`: consumers such as the MCP SDK
 * branch on `instanceof Response`, which an undici Response never satisfies.
 */
export async function fetchWithUndiciDispatcher(
  url: string | URL,
  init: Parameters<typeof fetch>[1],
): Promise<Response> {
  return toGlobalResponse(await fetch(url, init));
}

function toGlobalResponse(response: UndiciResponse): Response {
  return new Response(response.body as ReadableStream | null, {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers],
  });
}
