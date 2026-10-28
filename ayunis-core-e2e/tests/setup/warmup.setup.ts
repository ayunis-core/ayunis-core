import { test } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';

// Warms the Vite dev server's module-transform cache by walking the chat
// flow once before the parallel suite starts. Cold, code-split routes
// (/chat → /chats/$threadId) request dozens of on-demand transforms; under
// many parallel workers a cold transform can stall and strand navigation
// (observed as runs stuck "in flight"). One warm pass makes every
// subsequent navigation hit the cache. Irrelevant against a built frontend
// (CI), but harmless there.
test('warm up chat routes', async ({ page }) => {
  await startThread(page, 'Warmup');
});
