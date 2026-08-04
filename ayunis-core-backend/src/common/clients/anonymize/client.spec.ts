import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ProviderFailureClass } from 'src/common/errors/provider.errors';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { toSlimTransportError } from './client';

const RAW_USER_TEXT = 'Max Mustermann, geboren am 01.02.1980, wohnhaft in Bonn';

function axiosConfig(): InternalAxiosRequestConfig {
  return {
    url: '/analyze',
    method: 'post',
    data: JSON.stringify({ text: RAW_USER_TEXT }),
    headers: {},
  } as unknown as InternalAxiosRequestConfig;
}

function axiosTimeout(): AxiosError {
  return new AxiosError(
    'timeout of 60000ms exceeded',
    'ETIMEDOUT',
    axiosConfig(),
  );
}

function axiosServerFailure(): AxiosError {
  const response = {
    status: 503,
    data: { detail: 'model worker crashed' },
  } as AxiosResponse;
  return new AxiosError(
    'Request failed with status code 503',
    'ERR_BAD_RESPONSE',
    axiosConfig(),
    {},
    response,
  );
}

describe('toSlimTransportError', () => {
  it('strips the request payload so raw user text can never reach logs', () => {
    const slim = toSlimTransportError(axiosTimeout());

    expect('config' in slim).toBe(false);
    expect('request' in slim).toBe(false);
    expect('response' in slim).toBe(false);
    expect(JSON.stringify({ ...slim, message: slim.message })).not.toContain(
      'Mustermann',
    );
  });

  it('keeps the fields the transport classifier reads', () => {
    const slim = toSlimTransportError(axiosTimeout());

    expect(slim.message).toBe('timeout of 60000ms exceeded');
    expect(classifyTransportError(slim)?.failureClass).toBe(
      ProviderFailureClass.TIMEOUT,
    );
  });

  it('keeps the upstream status the taxonomy needs for 5xx vs 4xx routing', () => {
    const slim = toSlimTransportError(axiosServerFailure());

    expect(extractUpstreamStatus(slim)).toBe(503);
    expect('response' in slim).toBe(false);
  });

  it('preserves the low-level cause chain that carries errno codes', () => {
    const dnsFailure = Object.assign(new Error('getaddrinfo EAI_AGAIN'), {
      code: 'EAI_AGAIN',
    });
    const wrapped = new AxiosError('Network Error', undefined, axiosConfig());
    wrapped.cause = dnsFailure;

    const slim = toSlimTransportError(wrapped);

    expect(classifyTransportError(slim)?.failureClass).toBe(
      ProviderFailureClass.CONNECTION,
    );
  });

  it('passes non-axios errors through unchanged', () => {
    const plain = new Error('something else');
    expect(toSlimTransportError(plain)).toBe(plain);
  });

  it('wraps non-Error rejections', () => {
    const slim = toSlimTransportError('boom');
    expect(slim).toBeInstanceOf(Error);
    expect(slim.message).toBe('boom');
  });
});
