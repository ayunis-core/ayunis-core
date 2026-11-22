import type { APIRequestContext } from '@playwright/test';
import type { ArtifactResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { chat } from './memory.client';

export type ArtifactToolName =
  | 'create_document'
  | 'create_diagram'
  | 'update_diagram'
  | 'read_diagram'
  | 'create_spreadsheet'
  | 'update_spreadsheet'
  | 'read_spreadsheet'
  | 'read_document'
  | 'update_document'
  | 'edit_document';

/** What the model sees after a successful create or update. */
export const ARTIFACT_WRITE_SUCCEEDED = 'Tool has been displayed successfully';

export type SpreadsheetCell = string | number | null;

export interface DiagramReading {
  artifactId: string;
  title: string;
  version: number;
  content: string;
}

export interface SpreadsheetReading {
  artifactId: string;
  title: string;
  version: number;
  columns: string[];
  rows: SpreadsheetCell[][];
  nextPage: unknown;
}

/** The result text the run's `tool` call returned to the mock model. */
export async function callArtifactTool(
  api: APIRequestContext,
  threadId: string,
  tool: ArtifactToolName,
  args: Record<string, unknown>,
): Promise<string> {
  const answer = await chat(
    api,
    threadId,
    `E2E artifact call ${tool} ${JSON.stringify(args)}`,
  );
  const prefix = 'artifact-tool-result::';
  if (!answer.startsWith(prefix)) {
    throw new Error(`Not an artifact tool result: ${answer}`);
  }
  return answer.slice(prefix.length);
}

/**
 * Lets the mock model create the artifact and returns it. The model only
 * sees a display acknowledgement, so the artifact is found by its title.
 */
export async function createArtifactByTool(
  api: APIRequestContext,
  threadId: string,
  tool: 'create_diagram' | 'create_spreadsheet',
  args: { title: string } & Record<string, unknown>,
): Promise<ArtifactResponseDto> {
  const result = await callArtifactTool(api, threadId, tool, args);
  const artifacts = await generatedApi.artifactsControllerFindByThread(
    threadId,
    { api },
  );
  const created = artifacts.find((artifact) => artifact.title === args.title);
  if (!created) throw new Error(`${tool} created no artifact: ${result}`);
  return created;
}

export function spreadsheetContent(
  columns: string[],
  rows: SpreadsheetCell[][],
): string {
  return JSON.stringify({ format: 'spreadsheet-v1', columns, rows });
}

/** Saves new content as the user does in the editor. */
export async function saveArtifactAsUser(
  api: APIRequestContext,
  artifactId: string,
  content: string,
): Promise<void> {
  await generatedApi.artifactsControllerUpdate(
    artifactId,
    { content },
    { api },
  );
}

/** Replaces every `{{pii:…}}` placeholder with its value from a dictionary. */
export function resolvePlaceholders(
  text: string,
  dictionary: readonly { token: string; value: string }[],
): string {
  const values = new Map(dictionary.map((mask) => [mask.token, mask.value]));
  return text.replace(
    /\{\{pii:[A-Z][A-Z0-9_]*_\d+\}\}/g,
    (token) => values.get(token) ?? token,
  );
}

export async function currentArtifactContent(
  api: APIRequestContext,
  artifactId: string,
): Promise<{ version: number; content: string | undefined }> {
  const artifact = await generatedApi.artifactsControllerFindOne(artifactId, {
    api,
  });
  return {
    version: artifact.currentVersionNumber,
    content: artifact.versions?.find(
      (version) => version.versionNumber === artifact.currentVersionNumber,
    )?.content,
  };
}
