import type { Page } from "@playwright/test";
import { delay } from "../lib/delay";

export async function showProjectSkills(page: Page): Promise<void> {
  await page.getByTestId("workspace-tab-skills").click();
  await delay(700);
}

export async function showProjectInstructions(page: Page): Promise<void> {
  await page.getByTestId("workspace-tab-instructions").click();
  await page.getByTestId("workspace-instruction-input").focus();
  await delay(700);
}

export async function openChatProjectKnowledge(page: Page): Promise<void> {
  await page.getByTestId("workspace-context-toggle-knowledge").click();
  await delay(700);
}

export async function openChatProjectInstructions(page: Page): Promise<void> {
  await page.getByTestId("workspace-context-toggle-instructions").click();
  await delay(700);
}
