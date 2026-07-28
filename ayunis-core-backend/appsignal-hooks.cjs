// Hooks for the AppSignal OpenTelemetry setup in appsignal.cjs. Kept
// dependency-free (no dotenv, no @appsignal import) so tests can load this
// file without booting the AppSignal client.

// Must match the User-Agent the URL crawler sends
// (cheerio.url-retriever.ts) — it is the key that scopes the undici
// ignore hook to crawler traffic.
const CRAWLER_USER_AGENT = 'Ayunis/1.0';

/**
 * Identifies outbound requests made by the URL crawler / website-content
 * tool. Their failures against arbitrary user-supplied hosts (dead domains,
 * unreachable intranet IPs, slow servers) are caught and surfaced as domain
 * errors by the retriever, so the undici instrumentation must not record the
 * raw socket errors as AppSignal incidents (AYC-538). Requests to model/OCR
 * providers do not carry this User-Agent and stay fully instrumented.
 */
function isCrawlerRequest(request) {
  return headerValue(request.headers, 'user-agent') === CRAWLER_USER_AGENT;
}

/**
 * Identifies the listening stream the MCP SDK's StreamableHTTPClientTransport
 * opens in the background on connect. The client adapter opens one connection
 * per operation and always closes it, and close() unconditionally aborts that
 * still-open stream — so undici reports an AbortError on a request the
 * application deliberately cancelled and never consumed, after the operation
 * already succeeded (AYC-555).
 *
 * The listening stream is the only outbound GET sending exactly
 * `text/event-stream`; MCP JSON-RPC calls are POSTs sending
 * `application/json, text/event-stream`, so genuine connectivity and auth
 * failures stay fully instrumented.
 */
function isMcpEventStreamRequest(request) {
  return (
    request.method === 'GET' &&
    headerValue(request.headers, 'accept') === 'text/event-stream'
  );
}

/**
 * The undici ignore hook wired in appsignal.cjs. Returning true skips span
 * creation entirely, so no exception can be recorded for the request.
 */
function shouldIgnoreRequest(request) {
  return isCrawlerRequest(request) || isMcpEventStreamRequest(request);
}

// Undici request headers are either a raw `name: value\r\n` string (undici
// v5) or a flat [name, value, ...] array whose values may be string arrays
// (undici v6).
function headerValue(headers, name) {
  if (typeof headers === 'string') {
    for (const line of headers.split('\r\n')) {
      const separatorIndex = line.indexOf(':');
      if (
        separatorIndex !== -1 &&
        line.slice(0, separatorIndex).trim().toLowerCase() === name
      ) {
        return line.slice(separatorIndex + 1).trim();
      }
    }
    return undefined;
  }
  if (Array.isArray(headers)) {
    for (let i = 0; i + 1 < headers.length; i += 2) {
      if (String(headers[i]).toLowerCase() === name) {
        const value = headers[i + 1];
        return String(Array.isArray(value) ? value[0] : value);
      }
    }
  }
  return undefined;
}

module.exports = {
  isCrawlerRequest,
  isMcpEventStreamRequest,
  shouldIgnoreRequest,
  CRAWLER_USER_AGENT,
};
