import type { APIRequestContext } from "@playwright/test";
import { config } from "../../config";
import { generatedApi } from "./generated-api";
import { chat, defaultModel } from "./memory.client";

/** What the run offered for past chats, as the mock model reports it. */
export interface PastChatsReport {
  tools: string;
  section: string;
}

export const NO_PAST_CHATS: PastChatsReport = { tools: "none", section: "no" };
export const WITH_PAST_CHATS: PastChatsReport = {
  tools: "chat_list,chat_grep,chat_read",
  section: "yes",
};

export interface PastChatListing {
  page: number;
  totalPages: number;
  totalChats: number;
  chats: {
    threadId: string;
    title: string | null;
    createdAt: string;
    lastActivityAt: string;
  }[];
}

export interface PastChatReading {
  threadId: string;
  totalMessages: number;
  messages: { number: number; role: string; text: string }[];
  nextMessageNumber: number | null;
}

export interface PastMessageGrep {
  matches: {
    threadId: string;
    title: string | null;
    messageNumber: number;
    role: string;
    createdAt: string;
    excerpt: string;
  }[];
  moreMatches: boolean;
}

export const NO_GREP_MATCH =
  "No message in the earlier chats matches this pattern.";

export async function reportPastChats(
  api: APIRequestContext,
  threadId: string,
  apiURL = config.apiURL,
): Promise<PastChatsReport> {
  const answer = await chat(api, threadId, "E2E report past chats", apiURL);
  const [kind, tools, section] = answer.split("::");
  if (kind !== "past-chats-report") {
    throw new Error(`Not a past chats report: ${answer}`);
  }
  return {
    tools: tools.replace("tools=", ""),
    section: section.replace("section=", ""),
  };
}

/** The result text the run's `tool` call returned to the mock model. */
export async function callPastChatTool(
  api: APIRequestContext,
  threadId: string,
  tool: "chat_list" | "chat_read" | "chat_grep",
  args: Record<string, unknown>,
): Promise<string> {
  const answer = await chat(
    api,
    threadId,
    `E2E past chats call ${tool} ${JSON.stringify(args)}`,
  );
  const prefix = "past-chats-result::";
  if (!answer.startsWith(prefix)) {
    throw new Error(`Not a past chats result: ${answer}`);
  }
  return answer.slice(prefix.length);
}

export async function listPastChats(
  api: APIRequestContext,
  threadId: string,
  args: { page?: number; from?: string; to?: string } = {},
): Promise<PastChatListing> {
  return JSON.parse(
    await callPastChatTool(api, threadId, "chat_list", args),
  ) as PastChatListing;
}

/** IDs of every chat `chat_list` offers in the thread, across all pages. */
export async function listedPastChatIds(
  api: APIRequestContext,
  threadId: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const listing = await listPastChats(api, threadId, { page });
    ids.push(...listing.chats.map((listed) => listed.threadId));
    if (page >= listing.totalPages) return ids;
  }
}

/** The matches of `chat_grep`; none when nothing matched. */
export async function grepPastChats(
  api: APIRequestContext,
  threadId: string,
  args: { pattern: string; from?: string; to?: string },
): Promise<PastMessageGrep> {
  const result = await callPastChatTool(api, threadId, "chat_grep", args);
  if (result === NO_GREP_MATCH) return { matches: [], moreMatches: false };
  return JSON.parse(result) as PastMessageGrep;
}

/** The reading, or null when `chat_read` did not find the chat. */
export async function readPastChat(
  api: APIRequestContext,
  threadId: string,
  args: { threadId: string; messageNumber?: number; turns?: number },
): Promise<PastChatReading | null> {
  const result = await callPastChatTool(api, threadId, "chat_read", args);
  if (result === `No chat with ID ${args.threadId} was found.`) return null;
  return JSON.parse(result) as PastChatReading;
}

/** A new chat on the user's default model, in a workspace when given. */
export async function createPastChatsChat(
  api: APIRequestContext,
  options: { workspaceId?: string; isAnonymous?: boolean } = {},
): Promise<string> {
  const thread = await generatedApi.threadsControllerCreate(
    {
      modelId: (await defaultModel(api)).id,
      isAnonymous: options.isAnonymous ?? false,
      ...(options.workspaceId && { workspaceId: options.workspaceId }),
    },
    { api },
  );
  return thread.id;
}
