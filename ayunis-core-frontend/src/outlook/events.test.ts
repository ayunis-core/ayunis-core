import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Handler = (event: { completed: () => void }) => void;

function fakeOffice(handlers: Map<string, Handler>) {
  return {
    actions: {
      associate: (name: string, handler: Handler) =>
        handlers.set(name, handler),
    },
    onReady: () => Promise.resolve(),
  };
}

async function browserHandlers(): Promise<Map<string, Handler>> {
  const handlers = new Map<string, Handler>();
  vi.stubGlobal('Office', fakeOffice(handlers));
  await import('@/outlook/events');
  return handlers;
}

function classicHandlers(): Map<string, Handler> {
  const handlers = new Map<string, Handler>();
  const source = readFileSync(
    resolve(import.meta.dirname, '../../public/outlook/events-classic.js'),
    'utf8',
  );
  // Our own static file, run as classic Outlook does: alone, with only the
  // Office global.
  // eslint-disable-next-line sonarjs/code-eval
  runInNewContext(source, { Office: fakeOffice(handlers) });
  return handlers;
}

describe('Outlook launch-event runtimes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Classic Outlook on Windows runs its own file; a name it lacks leaves
  // Outlook waiting on the add-in there while the browser runtime works.
  it('registers the same handlers in classic Outlook as in browser-based Outlook, each completing at once', async () => {
    const browser = await browserHandlers();
    const classic = classicHandlers();

    expect([...classic.keys()]).toEqual([...browser.keys()]);
    for (const [name, handler] of classic) {
      const completed = vi.fn();
      handler({ completed });
      expect(completed, name).toHaveBeenCalledOnce();
    }
  });
});
