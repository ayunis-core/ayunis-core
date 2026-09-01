import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
  type Transport,
} from '@modelcontextprotocol/client';
import {
  StdioClientTransport,
  type StdioServerParameters,
} from '@modelcontextprotocol/client/stdio';

export type McpTransportFactory = () => Transport | Promise<Transport>;

export const createStreamableHttpTransport =
  (
    url: URL,
    options?: StreamableHTTPClientTransportOptions,
  ): McpTransportFactory =>
  () =>
    new StreamableHTTPClientTransport(url, options);

export const createStdioTransport =
  (parameters: StdioServerParameters): McpTransportFactory =>
  () =>
    new StdioClientTransport(parameters);
