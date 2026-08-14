import { expect, type Page } from "@playwright/test";
import { test } from "../../src/fixtures/test";
import {
  createProjectContextFixture,
  createProjectThread,
} from "../../src/factories/workspace-context.factory";
import { startThread } from "../../src/flows/chat.flow";
import { recordGif } from "./lib/record-gif";
import { shotPath } from "./lib/media-paths";
import {
  routeAnchor,
  SCREENSHOT_ROUTES,
  VIEWPORTS,
  type ScreenshotRoute,
  type ScreenshotRouteName,
  type ViewportLabel,
} from "./routes";
import { demoScenesByRoute } from "./scenes";
import {
  openChatProjectInstructions,
  openChatProjectKnowledge,
  showProjectInstructions,
  showProjectSkills,
} from "./scenes/workspace-context.scenes";

// Captures full-page screenshots and short demos of key routes for PR review —
// run explicitly via `--project=screenshots` (not part of the regular suite).
// CI publishes output to the PR via scripts/publish-pr-screenshots.sh.
const selectedRoutes =
  process.env.SCREENSHOT_ROUTES?.split(",").filter(Boolean);

const PROJECT_CONTEXT_ROUTE = "workspace-project-context";
const CHAT_PROJECT_CONTEXT_ROUTE = "chat-project-context";

function shouldCapture(name: string): boolean {
  return selectedRoutes === undefined || selectedRoutes.includes(name);
}

async function expectRouteReady(
  page: Page,
  route: ScreenshotRoute,
  viewport: ViewportLabel,
): Promise<void> {
  await expect(routeAnchor(page, route, viewport)).toBeVisible();
}

async function recordRouteScenes(
  page: Page,
  route: ScreenshotRoute,
  viewport: ViewportLabel,
): Promise<void> {
  for (const scene of demoScenesByRoute[route.name]) {
    await page.goto(route.path);
    await expectRouteReady(page, route, viewport);
    await recordGif(page, route.name, scene.name, viewport, () =>
      scene.action(page),
    );
  }
}

async function recordConversationScenes(
  page: Page,
  viewport: ViewportLabel,
): Promise<void> {
  const routeName: ScreenshotRouteName = "chat-conversation";
  for (const scene of demoScenesByRoute[routeName]) {
    await startThread(page, "Screenshot this conversation");
    await recordGif(page, routeName, scene.name, viewport, () =>
      scene.action(page),
    );
  }
}

async function createProjectContext(
  api: Parameters<typeof createProjectContextFixture>[0],
  label: string,
) {
  return createProjectContextFixture(api, label, {
    attach: true,
    includeDocuments: true,
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of SCREENSHOT_ROUTES) {
      if (shouldCapture(route.name)) {
        test(`${route.name}`, async ({ page }) => {
          await page.goto(route.path);
          await expect(routeAnchor(page, route, viewport.label)).toBeVisible();
          await page.screenshot({
            path: shotPath(route.name, viewport.label),
            fullPage: true,
          });
          await recordRouteScenes(page, route, viewport.label);
        });
      }
    }

    if (shouldCapture(PROJECT_CONTEXT_ROUTE)) {
      test(PROJECT_CONTEXT_ROUTE, async ({ page, api }) => {
        const fixture = await createProjectContext(
          api,
          `Bauamt Süd ${viewport.label}`,
        );
        await page.goto(`/workspaces/${fixture.workspace.id}`);
        await expect(page.getByTestId("workspace-page")).toBeVisible();
        await page.getByTestId("workspace-tab-knowledge").click();
        await expect(
          page.getByTestId(
            `workspace-knowledge-base-${fixture.knowledgeBase.id}`,
          ),
        ).toBeVisible();
        await page.screenshot({
          path: shotPath(PROJECT_CONTEXT_ROUTE, viewport.label),
          fullPage: true,
        });
        await recordGif(
          page,
          PROJECT_CONTEXT_ROUTE,
          "show-skills",
          viewport.label,
          () => showProjectSkills(page),
        );
        await recordGif(
          page,
          PROJECT_CONTEXT_ROUTE,
          "show-instructions",
          viewport.label,
          () => showProjectInstructions(page),
        );
      });
    }

    if (shouldCapture(CHAT_PROJECT_CONTEXT_ROUTE)) {
      test(CHAT_PROJECT_CONTEXT_ROUTE, async ({ page, api }) => {
        const fixture = await createProjectContext(
          api,
          `Bauamt Süd Chat ${viewport.label}`,
        );
        const thread = await createProjectThread(api, fixture.workspace.id);
        await page.goto(`/chats/${thread.id}`);
        await expect(page.getByTestId("input")).toBeVisible();
        await page.getByTestId("workspace-context-toggle-instructions").click();
        await expect(
          page.getByTestId("workspace-context-side-panel"),
        ).toBeVisible();
        await page.screenshot({
          path: shotPath(CHAT_PROJECT_CONTEXT_ROUTE, viewport.label),
          fullPage: true,
        });
        await recordGif(
          page,
          CHAT_PROJECT_CONTEXT_ROUTE,
          "open-knowledge",
          viewport.label,
          () => openChatProjectKnowledge(page),
        );
        await recordGif(
          page,
          CHAT_PROJECT_CONTEXT_ROUTE,
          "open-instructions",
          viewport.label,
          () => openChatProjectInstructions(page),
        );
      });
    }

    if (shouldCapture("chat-conversation")) {
      test("chat-conversation", async ({ page }) => {
        await startThread(page, "Screenshot this conversation");
        await expect(page.getByTestId("input")).toBeVisible();
        await page.screenshot({
          path: shotPath("chat-conversation", viewport.label),
          fullPage: true,
        });
        await recordConversationScenes(page, viewport.label);
      });
    }
  });
}
