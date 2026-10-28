/* eslint-disable sonarjs/no-hardcoded-ip -- security regression fixtures */
import type { Request } from 'express';
import { getClientIp } from './ip.util';

function request(ip?: string, remoteAddress?: string): Request {
  return {
    ip,
    socket: { remoteAddress },
    headers: {
      'x-forwarded-for': '198.51.100.42',
      'x-real-ip': '198.51.100.43',
      'cf-connecting-ip': '198.51.100.44',
    },
  } as unknown as Request;
}

describe('getClientIp', () => {
  it('uses the Express-resolved IP instead of client-controlled headers or the proxy socket', () => {
    expect(getClientIp(request('203.0.113.7', '10.0.0.1'))).toBe('203.0.113.7');
  });

  it('uses the socket when Express has no IP', () => {
    expect(getClientIp(request(undefined, '203.0.113.7'))).toBe('203.0.113.7');
  });

  it('returns null when neither Express nor the socket has an IP', () => {
    expect(getClientIp(request())).toBeNull();
  });
});
