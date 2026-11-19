import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./database.client";
import type { ReleaseNoteMedia } from "./database.client";

/**
 * Only the hourly Announcable sync creates release notes, so specs insert
 * them directly. They are announced, so they are unread for every user who
 * joined before. The sync deletes notes Announcable does not have: a spec
 * that is still running an hour after the backend started can lose its note.
 */
export async function insertReleaseNote(params: {
  headline: string;
  body: string;
  media: ReleaseNoteMedia | null;
}): Promise<string> {
  const id = randomUUID();
  const { media } = params;
  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO release_notes
         (id, "announcableId", headline, body, "lastUpdateOn", announced,
          "publishedOn", "mediaType", "mediaUrl", "mediaStorageKey",
          "mediaContentType", "createdAt")
       VALUES ($1, $2, $3, $4, 'e2e', true, CURRENT_DATE, $5, $6, $7, $8, $9)`,
      [
        id,
        `e2e-${id}`,
        params.headline,
        params.body,
        media?.type ?? null,
        media?.type === "loom" ? media.url : null,
        media?.type === "image" ? media.storageKey : null,
        media?.type === "image" ? media.contentType : null,
        // Passed as a Date like the backend does, so it compares with the
        // creation time of users on a host that is not on UTC too.
        new Date(),
      ],
    );
    return id;
  } finally {
    await client.end();
  }
}
