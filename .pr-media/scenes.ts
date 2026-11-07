import { config } from '../src/config';
import type { PrMediaContext, PrMediaScene } from './types';

// A routine with one finished run: one notification and one routine chat.
async function routineWithRun({
  page,
  expect,
}: PrMediaContext): Promise<string> {
  const api = `${config.apiURL}/api`;
  const subject = 'Gewerberecht NRW';
  const created = await page.request.post(`${api}/routines`, {
    data: {
      name: 'Verkündungsplattform NRW',
      prompt: `E2E notify routine: ${subject}`,
      dailyTime: '07:00',
      internetEnabled: true,
    },
  });
  const { id } = (await created.json()) as { id: string };
  await page.request.post(`${api}/routines/${id}/run`);
  await expect
    .poll(
      async () =>
        (
          (await (await page.request.get(`${api}/routines/${id}`)).json()) as {
            lastRunStatus: string | null;
          }
        ).lastRunStatus,
      { timeout: 30_000 },
    )
    .toBe('succeeded');
  return id;
}

function routinePageScene(
  name: string,
  tab: string,
  ready: string,
  viewports: PrMediaScene['viewports'],
): PrMediaScene {
  return {
    name,
    path: '/routines',
    viewports,
    waitFor: async (context) => {
      const { page } = context;
      const id = await routineWithRun(context);
      await page.goto(`/routines/${id}${tab}`);
      return page.getByTestId(ready).first();
    },
  };
}

export default [
  routinePageScene(
    'routine-page-configuration',
    '',
    'routine-form',
    ['desktop', 'mobile'],
  ),
  routinePageScene(
    'routine-page-notifications',
    '?tab=notifications',
    'notification-item',
    ['desktop'],
  ),
  routinePageScene(
    'routine-page-chats',
    '?tab=chats',
    'routine-chat-item',
    ['desktop'],
  ),
] satisfies PrMediaScene[];
