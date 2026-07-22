import { WinstonTransport } from '@appsignal/nodejs';
import {
  AppsignalLogTransport,
  buildAttributes,
} from './appsignal-log.transport';

describe('AppsignalLogTransport', () => {
  it('redacts attributes before delegating to WinstonTransport', () => {
    const superLog = jest
      .spyOn(WinstonTransport.prototype, 'log')
      .mockImplementation((_info: unknown, callback: () => void) => callback());
    const transport = new AppsignalLogTransport({ group: 'app' });
    const callback = jest.fn();

    transport.log(
      {
        level: 'info',
        message: 'completion failed',
        context: 'InferenceService',
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'secret prompt' }],
      },
      callback,
    );

    expect(superLog).toHaveBeenCalledTimes(1);
    const forwarded = superLog.mock.calls[0][0] as Record<string, unknown>;
    expect(forwarded).toMatchObject({
      level: 'info',
      message: 'completion failed',
      'nestjs.context': 'InferenceService',
      model: 'gpt-5',
      messages: '[redacted]',
    });
    expect(callback).toHaveBeenCalled();

    superLog.mockRestore();
  });
});

describe('buildAttributes', () => {
  it('forwards safe scalar metadata unchanged', () => {
    const attrs = buildAttributes('MyContext', {
      model: 'gpt-5',
      messageCount: 3,
      hasSystem: true,
    });

    expect(attrs).toMatchObject({
      'nestjs.context': 'MyContext',
      model: 'gpt-5',
      messageCount: 3,
      hasSystem: true,
    });
  });

  it('omits nestjs.context when no context is provided', () => {
    const attrs = buildAttributes(undefined, { model: 'gpt-5' });

    expect(attrs).not.toHaveProperty('nestjs.context');
    expect(attrs).toMatchObject({ model: 'gpt-5' });
  });

  it('redacts Error instances', () => {
    const sdkError = Object.assign(new Error('SDK boom'), {
      body: { messages: [{ role: 'user', content: 'secret prompt' }] },
    });

    const attrs = buildAttributes('Ctx', {
      cause: sdkError,
    });

    expect(attrs['cause']).toBe('[redacted]');
  });

  it('redacts denylisted keys', () => {
    const attrs = buildAttributes('Ctx', {
      messages: [{ role: 'user', content: 'secret' }],
      tools: [{ name: 'do_thing' }],
      body: 'raw body',
      prompt: 'raw prompt',
      input: { foo: 'bar' },
      system: 'system prompt',
      request: { url: '/v1/messages' },
      response: { status: 500 },
      completionOptions: { messages: [] },
      error: 'string-form error',
    });

    for (const key of [
      'messages',
      'tools',
      'body',
      'prompt',
      'input',
      'system',
      'request',
      'response',
      'completionOptions',
      'error',
    ]) {
      expect(attrs[key]).toBe('[redacted]');
    }
  });

  it('preserves safe keys alongside redacted ones', () => {
    const attrs = buildAttributes('Ctx', {
      model: 'claude-sonnet-4-5',
      messageCount: 2,
      messages: [{ role: 'user', content: 'secret' }],
    });

    expect(attrs).toMatchObject({
      'nestjs.context': 'Ctx',
      model: 'claude-sonnet-4-5',
      messageCount: 2,
      messages: '[redacted]',
    });
  });

  it('skips Winston symbol keys', () => {
    const attrs = buildAttributes(undefined, {
      'Symbol(level)': 'info',
      model: 'gpt-5',
    });

    expect(attrs).not.toHaveProperty('Symbol(level)');
    expect(attrs).toMatchObject({ model: 'gpt-5' });
  });
});
