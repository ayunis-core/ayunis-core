import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';

export interface BrokerIdentity {
  email: string;
  orgId: string;
  subject: string;
}

// A loopback broker exercises Core's real OIDC validation without customer credentials.
export async function startOidcBroker(port = 4422) {
  const issuer = `http://localhost:${port}`;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = randomUUID();
  const codes = new Map<string, { params: URLSearchParams; identity: BrokerIdentity }>();
  const tokens = new Map<string, BrokerIdentity>();
  let identity: BrokerIdentity;

  function jwt(claims: object) {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const input = `${encode({ alg: 'RS256', kid })}.${encode(claims)}`;
    return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  }

  async function respond(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', issuer);
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/.well-known/openid-configuration') {
      res.end(JSON.stringify({ issuer, authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`, userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/jwks`, response_types_supported: ['code'],
        subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic'],
        code_challenge_methods_supported: ['S256'] }));
    } else if (url.pathname === '/jwks') {
      res.end(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }] }));
    } else if (url.pathname === '/authorize') {
      if (!identity) { res.writeHead(400).end(); return; }
      const code = randomUUID();
      codes.set(code, { params: url.searchParams, identity: { ...identity } });
      const callback = new URL(url.searchParams.get('redirect_uri')!);
      callback.searchParams.set('code', code);
      callback.searchParams.set('state', url.searchParams.get('state')!);
      res.writeHead(302, { Location: callback.toString() }).end();
    } else if (url.pathname === '/token') {
      let body = '';
      for await (const chunk of req) body += String(chunk);
      const form = new URLSearchParams(body);
      const session = codes.get(form.get('code') ?? '');
      codes.delete(form.get('code') ?? '');
      const challenge = createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url');
      if (!session || challenge !== session.params.get('code_challenge')) {
        res.writeHead(400).end(JSON.stringify({ error: 'invalid_grant' })); return;
      }
      const token = randomUUID();
      tokens.set(token, session.identity);
      const now = Math.floor(Date.now() / 1000);
      res.end(JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 300,
        id_token: jwt({ iss: issuer, sub: session.identity.subject, aud: 'sso-link-e2e',
          nonce: session.params.get('nonce'), auth_time: now, iat: now, exp: now + 300, sid: randomUUID() }) }));
    } else if (url.pathname === '/userinfo') {
      const user = tokens.get(req.headers.authorization?.replace('Bearer ', '') ?? '');
      if (!user) { res.writeHead(401).end(); return; }
      res.end(JSON.stringify({ sub: user.subject, email: user.email, email_verified: true,
        name: 'SSO Test User', 'urn:zitadel:iam:user:resourceowner:id': user.orgId }));
    } else res.writeHead(404).end();
  }
  const server = createServer((req, res) => {
    void respond(req, res).catch(() => { res.writeHead(500).end(); });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, resolve);
  });
  return {
    setIdentity(value: BrokerIdentity) { identity = value; },
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
