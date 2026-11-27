import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  clearAdventCalendarDoor,
  createSuperAdminApi,
  getAdventCalendar,
  requestAdventCalendarDoorImage,
  saveAdventCalendarDoor,
  setAdventCalendarEnabled,
  uploadAdventCalendarDoorImage,
} from "../../src/clients/api/advent-calendar.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import { config } from "../../src/config";
import { createLargePng } from "../../src/factories/png.factory";
import { test, expect } from "../../src/fixtures/test";

// The backend runs with ADVENT_CALENDAR_NOW=2026-12-10T09:00:00+01:00
// (.github/workflows/e2e-tests.yml), so doors 1–10 are due and 11–24 locked.
// The switch and the doors are platform-wide, so these tests run one by one.
test.describe.configure({ mode: "serial" });

const DUE_DOOR = 4;
const LOCKED_DOOR = 20;
const TODAYS_DOOR = 10;
const key = randomUUID().slice(0, 8);
const PROMPT = `Schreibe ein Gedicht über den Advent ${key}`;

let superAdminApi: APIRequestContext;

test.beforeAll(async () => {
  superAdminApi = await createSuperAdminApi();
  await dismissWelcomeVideo(superAdminApi);
  await saveAdventCalendarDoor(superAdminApi, DUE_DOOR, {
    title: `Türchen ${DUE_DOOR} ${key}`,
    body: "Heute lernen Sie **Prompts** kennen.",
    buttons: [
      { kind: "prompt", label: "Ausprobieren", prompt: PROMPT },
      {
        kind: "quiz",
        label: "Quiz",
        question: "Was füllt der Prompt-Button aus?",
        answers: ["Nichts", "Das Eingabefeld eines neuen Chats"],
        correctAnswerIndex: 1,
        explanation: "Der Prompt wird eingetragen, aber nicht gesendet.",
      },
    ],
  });
  await uploadAdventCalendarDoorImage(
    superAdminApi,
    DUE_DOOR,
    createLargePng(320, 180, 0),
  );
  await saveAdventCalendarDoor(superAdminApi, LOCKED_DOOR, {
    title: `Geheim ${key}`,
    body: "Erst am 20. Dezember.",
    buttons: [],
  });
  await uploadAdventCalendarDoorImage(
    superAdminApi,
    LOCKED_DOOR,
    createLargePng(320, 180, 0),
  );
});

test.afterAll(async () => {
  await setAdventCalendarEnabled(superAdminApi, false);
  await clearAdventCalendarDoor(superAdminApi, DUE_DOOR);
  await clearAdventCalendarDoor(superAdminApi, LOCKED_DOOR);
  await clearAdventCalendarDoor(superAdminApi, TODAYS_DOOR);
  await superAdminApi.dispose();
});

test("a user opens a due door from the sidebar but never a locked one", async ({
  page,
  api,
}) => {
  await setAdventCalendarEnabled(superAdminApi, true);

  const calendar = await getAdventCalendar(api);
  expect(calendar.preview).toBe(false);
  const locked = calendar.doors.find((door) => door.day === LOCKED_DOOR);
  expect(locked).toMatchObject({ state: "locked", content: null });
  expect((await requestAdventCalendarDoorImage(api, LOCKED_DOOR)).status()).toBe(
    404,
  );

  await page.goto("/chat");
  await page.getByTestId("sidebar-advent-calendar").click();
  await expect(page).toHaveURL(/\/advent-calendar$/);
  await expect(
    page.getByTestId(`advent-calendar-door-${LOCKED_DOOR}`),
  ).toBeDisabled();
  await expect(
    page.getByTestId(`advent-calendar-door-${LOCKED_DOOR}`),
  ).toHaveAttribute("data-state", "locked");

  await page.goto(`/advent-calendar?door=${LOCKED_DOOR}`);
  await expect(page.getByTestId("advent-calendar")).toBeVisible();
  await expect(page.getByTestId("advent-calendar-door-dialog")).toHaveCount(0);

  const door = page.getByTestId(`advent-calendar-door-${DUE_DOOR}`);
  await expect(door).toHaveAttribute("data-state", "openable");
  await door.click();
  const dialog = page.getByTestId("advent-calendar-door-dialog");
  await expect(dialog.getByTestId("advent-calendar-door-title")).toHaveText(
    `Türchen ${DUE_DOOR} ${key}`,
  );
  await expect
    .poll(() =>
      dialog
        .getByTestId("advent-calendar-door-image")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(320);

  await dialog.getByTestId("advent-calendar-button-1").click();
  await dialog.getByTestId("advent-calendar-quiz-answer-0").click();
  const result = dialog.getByTestId("advent-calendar-quiz-result");
  await expect(result).toHaveAttribute("data-correct", "false");
  await expect(
    dialog.getByTestId("advent-calendar-quiz-explanation"),
  ).toBeVisible();
  await dialog.getByTestId("advent-calendar-quiz-retry").click();
  await dialog.getByTestId("advent-calendar-quiz-answer-1").click();
  await expect(result).toHaveAttribute("data-correct", "true");

  await page.goto("/advent-calendar");
  await expect(door).toHaveAttribute("data-state", "opened");

  await door.click();
  await dialog.getByTestId("advent-calendar-button-0").click();
  await expect(page).toHaveURL(/\/chat\?prompt=/);
  await expect(page.getByTestId("input")).toHaveValue(PROMPT);
  await expect(page).toHaveURL(/\/chat\?prompt=/);
  await expect(page.getByTestId("user-message")).toHaveCount(0);
});

test("with the switch off users see no calendar while a super admin previews it", async ({
  page,
  browser,
}) => {
  await setAdventCalendarEnabled(superAdminApi, false);

  await page.goto("/advent-calendar");
  await expect(page.getByTestId("advent-calendar-not-available")).toBeVisible();
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await expect(page.getByTestId("sidebar-advent-calendar")).toHaveCount(0);

  const superAdminContext = await browser.newContext({
    baseURL: config.baseURL,
    storageState: await superAdminApi.storageState(),
  });
  try {
    const superAdminPage = await superAdminContext.newPage();
    await superAdminPage.goto(`/advent-calendar?door=${LOCKED_DOOR}`);
    await expect(
      superAdminPage.getByTestId("advent-calendar-preview-banner"),
    ).toBeVisible();
    await expect(
      superAdminPage.getByTestId("advent-calendar-door-title"),
    ).toHaveText(`Geheim ${key}`);
  } finally {
    await superAdminContext.close();
  }
});

test("the new chat page offers today's door until it was opened", async ({
  page,
}) => {
  await setAdventCalendarEnabled(superAdminApi, true);
  await clearAdventCalendarDoor(superAdminApi, TODAYS_DOOR);
  const card = page.getByTestId("new-chat-advent-calendar-card");
  // The sidebar item reads the same calendar query, so once it shows the
  // card has had its data too.
  const calendarLoaded = page.getByTestId("sidebar-advent-calendar");

  await page.goto("/chat");
  await expect(calendarLoaded).toBeVisible();
  await expect(card).toHaveCount(0);

  await saveAdventCalendarDoor(superAdminApi, TODAYS_DOOR, {
    title: `Heute ${key}`,
    body: "Das heutige Türchen.",
    buttons: [],
  });
  await page.reload();
  await expect(card).toHaveAttribute("data-day", String(TODAYS_DOOR));
  await card.click();
  await expect(page).toHaveURL(
    new RegExp(`/advent-calendar\\?door=${TODAYS_DOOR}$`),
  );
  await expect(page.getByTestId("advent-calendar-door-title")).toHaveText(
    `Heute ${key}`,
  );

  await page.goto("/chat");
  await expect(calendarLoaded).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(calendarLoaded).toBeVisible();
  await expect(card).toHaveCount(0);
});
