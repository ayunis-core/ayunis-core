import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { getThread } from "../../src/clients/api/threads.client";
import { createPersonalThread } from "../../src/factories/workspace-context.factory";

test("moves a chat found in the chat overview into a workspace", async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Overview target ${suffix}` },
    { api },
  );
  const thread = await createPersonalThread(api);
  const title = `Older chat ${suffix}`;
  await generatedApi.threadsControllerUpdateTitle(
    thread.id,
    { title },
    { api },
  );

  await page.goto(`/chats?search=${encodeURIComponent(title)}`);
  const card = page.getByTestId("chat-card").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });
  await card.getByTestId("chat-workspace-menu-trigger").click();
  await page.getByTestId(`workspace-picker-item-${workspace.id}`).click();

  await expect
    .poll(async () => (await getThread(api, thread.id)).workspaceId)
    .toBe(workspace.id);
});
