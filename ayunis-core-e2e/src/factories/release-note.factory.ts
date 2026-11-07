import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { getCurrentUser } from "../clients/api/auth.client";
import { getDefaultModelSelection } from "../clients/api/model-modes.client";
import {
  createEmptyThread,
  sendThreadMessageWithImage,
} from "../clients/api/threads.client";
import {
  findUserMessageImage,
  insertReleaseNoteNotification,
} from "../clients/database.client";
import type { ReleaseNoteMedia } from "../clients/database.client";
import { createLargePng } from "./png.factory";

export const LOOM_EMBED_URL =
  "https://www.loom.com/embed/4f7c2d9e1b8a4c6d9e2f1a3b5c7d9e0f";

/**
 * A 16:9 PNG in object storage, put there by sending it in a chat; the
 * Announcable sync stores the images of the notes it imports itself.
 */
export async function storeReleaseNoteImage(
  api: APIRequestContext,
): Promise<Extract<ReleaseNoteMedia, { type: "image" }>> {
  const { orgId } = await getCurrentUser(api);
  const { permittedModelId } = await getDefaultModelSelection(api);
  const thread = await createEmptyThread(api, permittedModelId);
  const response = await sendThreadMessageWithImage(
    api,
    thread.id,
    "E2E release note image",
    { name: "release-note.png", mimeType: "image/png", buffer: createLargePng(320, 180, 0) },
  );
  expect(response.ok(), await response.text()).toBe(true);
  const { messageId, contentType } = await findUserMessageImage(thread.id);
  expect(contentType).toBe("image/png");
  return {
    type: "image",
    storageKey: `${orgId}/${thread.id}/${messageId}/0.png`,
    contentType,
  };
}

/** One release-note notification, without subheadline, for the user of `api`. */
export async function createReleaseNoteNotification(
  api: APIRequestContext,
  headline: string,
  media: ReleaseNoteMedia | null,
): Promise<string> {
  const { id: userId, orgId } = await getCurrentUser(api);
  return insertReleaseNoteNotification({
    userId,
    orgId,
    headline,
    body: "Ayunis erledigt wiederkehrende Recherchen jetzt automatisch. [Mehr erfahren](https://ayunis.com/routinen)",
    media,
  });
}
