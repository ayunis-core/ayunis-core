import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./started-thread-run', () => ({ startThreadRun: vi.fn() }));

const threadId = 'thread-1';
const waiting = { threadId, text: 'Summarise the minutes', images: [] };

/** A fresh copy of the module, as after a page reload: memory is empty. */
async function loadPage() {
  vi.resetModules();
  return import('./deferred-thread-run');
}

afterEach(() => window.localStorage.clear());

it('gives back the text of a message that was waiting when the page was reloaded', async () => {
  (await loadPage()).deferThreadRun(waiting);

  const reloaded = await loadPage();

  expect(reloaded.takeInterruptedThreadRunText(threadId)).toBe(
    'Summarise the minutes',
  );
  expect(reloaded.takeInterruptedThreadRunText(threadId)).toBeNull();
});

it('gives nothing back while the message is still waiting in this page', async () => {
  const page = await loadPage();
  page.deferThreadRun(waiting);

  expect(page.takeInterruptedThreadRunText(threadId)).toBeNull();
  expect(page.getDeferredThreadRun(threadId)).not.toBeNull();
});

it.each(['startDeferredThreadRun', 'cancelDeferredThreadRun'] as const)(
  'gives nothing back after a reload once %s settled the waiting message',
  async (settle) => {
    const page = await loadPage();
    page.deferThreadRun(waiting);
    page[settle](threadId);

    expect(
      (await loadPage()).takeInterruptedThreadRunText(threadId),
    ).toBeNull();
  },
);

it('forgets the kept text when a chat is deleted after a reload', async () => {
  (await loadPage()).deferThreadRun(waiting);
  const reloaded = await loadPage();

  reloaded.cancelDeferredThreadRun(threadId);

  expect(reloaded.takeInterruptedThreadRunText(threadId)).toBeNull();
});

it('keeps nothing for a message without text', async () => {
  (await loadPage()).deferThreadRun({ ...waiting, text: '' });

  expect((await loadPage()).takeInterruptedThreadRunText(threadId)).toBeNull();
});
