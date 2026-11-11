import { Agent, setGlobalDispatcher } from 'undici';

// Node 26 bundles undici 8, whose fetch negotiates HTTP/2 via ALPN. Provider
// SDKs then multiplex calls over long-lived sessions that Mistral, Azure and
// Bedrock reset with NGHTTP2_ENHANCE_YOUR_CALM before responding (AYC-1774).
// The `undici` dependency must share the bundled major, or the global fetch
// cannot drive this dispatcher.
export function installHttp1GlobalDispatcher(): Agent {
  const agent = new Agent({ allowH2: false });
  setGlobalDispatcher(agent);
  return agent;
}
