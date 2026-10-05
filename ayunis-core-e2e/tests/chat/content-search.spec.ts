import { request } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { startThread } from "../../src/flows/chat.flow";
import { createUser } from "../../src/factories/user.factory";
import { login } from "../../src/clients/api/auth.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import { config } from "../../src/config";
import { generatedApi } from "../../src/clients/api/generated-api";

test("finds chat content independently of its title", async ({
  page,
  api,
  browser,
  mail,
}) => {
  const keyword = `Beschaffung-${Date.now()}`;
  const title = `Haushaltsplanung-${Date.now()}`;
  const threadId = await startThread(page, `Bitte besprechen wir ${keyword}.`);
  await generatedApi.threadsControllerUpdateTitle(threadId, { title }, { api });

  await page.goto("/chats");
  const search = page.getByTestId("chats-search");
  await search.fill("unmatched-" + keyword);
  await expect(page).toHaveURL(new RegExp(`search=unmatched-${keyword}`));
  await expect(page.getByRole("main")).not.toContainText(title);
  await search.fill(keyword.toLowerCase());
  await expect(page).toHaveURL(new RegExp(`search=${keyword.toLowerCase()}`));
  await expect(page.getByRole("main")).toContainText(title);
  await search.fill(title);
  await expect(page).toHaveURL(new RegExp(`search=${title}`));
  await expect(page.getByRole("main")).toContainText(title);
  await search.fill("");
  await expect(page).toHaveURL(
    (url) => url.pathname === "/chats" && !url.searchParams.has("search"),
  );
  await expect(page.getByRole("main")).toContainText(title);

  const member = await createUser(api, mail, `content-search-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  const memberContext = await browser.newContext({ baseURL: config.baseURL });
  try {
    await login(memberApi, member.email, member.password);
    await dismissWelcomeVideo(memberApi);
    const { cookies } = await memberApi.storageState();
    await memberContext.addCookies(cookies);
    const memberPage = await memberContext.newPage();
    await memberPage.goto(`/chats?search=${keyword.toLowerCase()}`);
    const result = await generatedApi.threadsControllerFindAll(
      { search: keyword.toLowerCase() },
      { api: memberApi },
    );
    expect(result.data).toEqual([]);
    await expect(memberPage.getByTestId("chats-search")).toHaveValue(
      keyword.toLowerCase(),
    );
    await expect(memberPage.getByRole("main")).not.toContainText(title);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }
});
