/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import { getClientIp } from './ip.util';
import type { Request } from 'express';
import type { Socket } from 'net';

function createMockRequest(
  headers: Record<string, string | string[] | undefined> = {},
  socket: Partial<Socket> = {},
  ip?: string,
): Request {
  return {
    headers,
    socket: { remoteAddress: undefined, ...socket } as Socket,
    ip,
  } as unknown as Request;
}

describe('getClientIp', () => {
  it('should return the first IP from x-forwarded-for header', () => {
    const request = createMockRequest({
      'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178',
    });

    expect(getClientIp(request)).toBe('203.0.113.50');
  });

  it('should return a single IP from x-forwarded-for header', () => {
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.100',
    });

    expect(getClientIp(request)).toBe('192.168.1.100');
  });

  it('should handle x-forwarded-for as an array', () => {
    const request = createMockRequest({
      'x-forwarded-for': ['10.0.0.1, 10.0.0.2', '10.0.0.3'],
    });

    expect(getClientIp(request)).toBe('10.0.0.1');
  });

  it('should return x-real-ip when x-forwarded-for is absent', () => {
    const request = createMockRequest({
      'x-real-ip': '172.16.0.5',
    });

    expect(getClientIp(request)).toBe('172.16.0.5');
  });

  it('should return cf-connecting-ip when other headers are absent', () => {
    const request = createMockRequest({
      'cf-connecting-ip': '198.51.100.42',
    });

    expect(getClientIp(request)).toBe('198.51.100.42');
  });

  it('should fall back to socket remoteAddress', () => {
    const request = createMockRequest({}, { remoteAddress: '127.0.0.1' });

    expect(getClientIp(request)).toBe('127.0.0.1');
  });

  it('should fall back to request.ip when socket has no remoteAddress', () => {
    const request = createMockRequest({}, {}, '10.10.10.10');

    expect(getClientIp(request)).toBe('10.10.10.10');
  });

  it('should return null when no IP can be determined', () => {
    const request = createMockRequest();

    expect(getClientIp(request)).toBeNull();
  });

  it('should prioritize x-forwarded-for over x-real-ip', () => {
    const request = createMockRequest({
      'x-forwarded-for': '203.0.113.50',
      'x-real-ip': '172.16.0.5',
    });

    expect(getClientIp(request)).toBe('203.0.113.50');
  });

  it('should prioritize x-real-ip over cf-connecting-ip', () => {
    const request = createMockRequest({
      'x-real-ip': '172.16.0.5',
      'cf-connecting-ip': '198.51.100.42',
    });

    expect(getClientIp(request)).toBe('172.16.0.5');
  });

  it('should fall through when x-forwarded-for has an empty first entry', () => {
    const request = createMockRequest({
      'x-forwarded-for': ',10.0.0.1',
      'x-real-ip': '172.16.0.5',
    });

    expect(getClientIp(request)).toBe('172.16.0.5');
  });

  it('should trim whitespace from x-forwarded-for IPs', () => {
    const request = createMockRequest({
      'x-forwarded-for': '  203.0.113.50  , 70.41.3.18',
    });

    expect(getClientIp(request)).toBe('203.0.113.50');
  });
});
