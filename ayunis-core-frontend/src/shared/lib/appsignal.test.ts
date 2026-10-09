import { describe, it, expect, afterEach } from 'vitest';
import { act, createElement, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { Span } from '@appsignal/javascript';
import {
  ignoredErrorPatterns,
  backtracePathMatchers,
  dropBrowserExtensionErrors,
  isBrowserExtensionError,
  setAppsignalTags,
  clearAppsignalTags,
  applyContextTags,
  recoverableErrorReport,
} from './appsignal';

function spanWithStack(stack: string): Span {
  const error = new Error('boom');
  error.stack = stack;
  return new Span().setError(error);
}

const matchesAnyIgnore = (message: string) =>
  ignoredErrorPatterns.some((pattern) => pattern.test(message));

describe('ignoredErrorPatterns', () => {
  it.each([
    'The user aborted a request.',
    'The operation was aborted.',
    'signal is aborted without reason',
    'canceled',
    'Failed to fetch',
    'NetworkError when attempting to fetch a resource.',
    'Network Error',
    'Load failed',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications.',
  ])('ignores expected browser noise: %s', (message) => {
    expect(matchesAnyIgnore(message)).toBe(true);
  });

  it.each([
    "Cannot read properties of undefined (reading 'map')",
    'Maximum update depth exceeded',
    'Objects are not valid as a React child',
    // Unrecovered deploy skew, reported by the ErrorBoundary after the
    // chunk-reload guard gives up — must never be filtered.
    'Failed to fetch dynamically imported module: https://app.example.com/assets/ChatPage-abc.js',
  ])('keeps real application errors: %s', (message) => {
    expect(matchesAnyIgnore(message)).toBe(false);
  });
});

describe('backtracePathMatchers', () => {
  it('captures the origin-independent asset path', () => {
    const match = backtracePathMatchers[0].exec(
      'https://ki.example-municipality.de/assets/index-CmFbNJ3T.js',
    );
    expect(match?.[1]).toBe('assets/index-CmFbNJ3T.js');
  });

  it('does not match non-asset paths', () => {
    expect(backtracePathMatchers[0].test('https://example.com/config.js')).toBe(
      false,
    );
  });
});

describe('dropBrowserExtensionErrors', () => {
  it('drops errors whose origin frame is a browser extension', () => {
    const span = spanWithStack(
      [
        'TypeError: boom',
        '    at inject (chrome-extension://abcdefgh/content.js:10:5)',
        '    at https://app.example.com/assets/index-abc.js:1:100',
      ].join('\n'),
    );
    expect(dropBrowserExtensionErrors(span)).toBe(false);
  });

  it('keeps errors originating in application code', () => {
    const span = spanWithStack(
      [
        'TypeError: boom',
        '    at render (https://app.example.com/assets/index-abc.js:1:100)',
        '    at wrapped (moz-extension://abcdefgh/content.js:10:5)',
      ].join('\n'),
    );
    expect(dropBrowserExtensionErrors(span)).toBe(span);
  });

  it('keeps errors without any backtrace URLs', () => {
    const span = spanWithStack('Error: boom');
    expect(dropBrowserExtensionErrors(span)).toBe(span);
  });

  it('classifies extension origin frames', () => {
    const span = spanWithStack(
      'Error: boom\n    at safari-web-extension://xyz/content.js:1:1',
    );
    expect(isBrowserExtensionError(span)).toBe(true);
  });
});

describe('context tags', () => {
  afterEach(() => clearAppsignalTags());

  it('tags spans with the current user and org ids', () => {
    setAppsignalTags({ userId: 'user-1', orgId: 'org-1' });
    const span = applyContextTags(new Span());
    expect(span.getTags()).toEqual({ user_id: 'user-1', org_id: 'org-1' });
  });

  it('applies no tags after clearing', () => {
    setAppsignalTags({ userId: 'user-1', orgId: 'org-1' });
    clearAppsignalTags();
    const span = applyContextTags(new Span());
    expect(span.getTags()).toEqual({});
  });
});

describe('recoverableErrorReport', () => {
  const componentStack = '\n    at ThreadMessage\n    at ChatPage';
  const recoveryMessage =
    'There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.';

  it('reports the underlying cause with the recovery, component stack and route', () => {
    const cause = new TypeError(
      "Cannot read properties of undefined (reading 'id')",
    );
    const recovered = new Error(recoveryMessage, { cause });

    expect(
      recoverableErrorReport(recovered, { componentStack }, '/chats/$threadId'),
    ).toEqual({
      error: cause,
      params: {
        recoveredFrom: recoveryMessage,
        componentStack,
        route: '/chats/$threadId',
      },
    });
  });

  it('reports the React error itself when there is no Error cause', () => {
    const recovered = new Error(recoveryMessage, { cause: 'thrown string' });

    expect(recoverableErrorReport(recovered, {}, undefined).error).toBe(
      recovered,
    );
  });

  it('wraps a non-Error value so it is still reported', () => {
    expect(recoverableErrorReport('boom', {}, '/').error).toEqual(
      new Error('boom'),
    );
  });
});

describe('recoverableErrorReport with a real React recovery', () => {
  it('surfaces the throwing component and cause of a recovered concurrent render', async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const cause = new Error('first render failed');
    let renders = 0;
    function FlakyWidget() {
      renders += 1;
      if (renders === 1) throw cause;
      return null;
    }
    const reports: ReturnType<typeof recoverableErrorReport>[] = [];
    const root = createRoot(document.createElement('div'), {
      onRecoverableError: (error, errorInfo) =>
        reports.push(recoverableErrorReport(error, errorInfo, '/chats')),
    });

    await act(async () => {
      startTransition(() => root.render(createElement(FlakyWidget)));
      await Promise.resolve();
    });
    root.unmount();

    expect(reports).toHaveLength(1);
    expect(reports[0].error).toBe(cause);
    expect(reports[0].params.recoveredFrom).toMatch(/concurrent rendering/);
    expect(reports[0].params.componentStack).toContain('FlakyWidget');
  });
});
