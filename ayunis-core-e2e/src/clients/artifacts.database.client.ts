import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./database.client";

export interface ArtifactDictionaryEntry {
  category: string;
  maskIndex: number;
  value: string;
}

/**
 * Turns an artifact into an anonymous one whose title and current version
 * hold the placeholders of the given dictionary, as an anonymous run writes
 * it. Anonymous runs need the anonymisation service the CI stack lacks.
 */
export async function makeArtifactAnonymous(params: {
  artifactId: string;
  title: string;
  content: string;
  dictionary: ArtifactDictionaryEntry[];
}): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE artifacts SET "isAnonymous" = true, title = $2 WHERE id = $1`,
      [params.artifactId, params.title],
    );
    await client.query(
      `UPDATE artifact_versions v SET content = $2
       FROM artifacts a
       WHERE a.id = $1 AND v."artifactId" = a.id
         AND v."versionNumber" = a."currentVersionNumber"`,
      [params.artifactId, params.content],
    );
    for (const entry of params.dictionary) {
      await client.query(
        `INSERT INTO artifact_pii_masks (id, "artifactId", category, "maskIndex", value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          randomUUID(),
          params.artifactId,
          entry.category,
          entry.maskIndex,
          entry.value,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
