export type CoreApiResponse<T> =
  | { readonly ok: true; readonly status: number; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly data?: never };
interface CoreRequestOptions {
  baseUrl: string;
  signal: AbortSignal;
  headers: Record<string, string>;
}
interface CoreRequest {
  url: string;
  method: string;
  headers?: Record<string, string | undefined>;
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}
function requestHeaders(
  base: Record<string, string>,
  extra: CoreRequest["headers"],
): Headers {
  const headers = new Headers(base);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined) headers.set(key, value);
  }
  return headers;
}
function requestUrl(base: string, request: CoreRequest): URL {
  const url = new URL(`${base.replace(/\/$/, "")}${request.url}`);
  for (const [key, value] of Object.entries(request.params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}
export async function coreRequest<T>(
  request: CoreRequest,
  options?: CoreRequestOptions,
): Promise<CoreApiResponse<T>> {
  if (!options) throw new Error("Core transport options are required");
  const response = await fetch(requestUrl(options.baseUrl, request), {
    method: request.method,
    headers: requestHeaders(options.headers, request.headers),
    redirect: "error",
    signal: options.signal,
    ...(request.data === undefined
      ? {}
      : { body: JSON.stringify(request.data) }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return { ok: false, status: response.status };
  }
  const data = (await response.json()) as T;
  return { ok: true, status: response.status, data };
}
