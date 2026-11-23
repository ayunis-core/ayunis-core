import type { APIRequestContext } from "@playwright/test";
import { config } from "../../config";
import { chat } from "./memory.client";

/** What a run offered, as the mock model reports it. */
export interface ToolGroupsReport {
  /** The tool groups the run could load with load_tools. */
  groups: string[];
  /** The tools the run offered. */
  tools: string[];
}

export async function reportToolGroups(
  api: APIRequestContext,
  threadId: string,
  apiURL = config.apiURL,
): Promise<ToolGroupsReport> {
  const answer = await chat(api, threadId, "E2E report tool groups", apiURL);
  const [kind, groups, tools] = answer.split("::");
  if (kind !== "tool-groups-report") {
    throw new Error(`Not a tool groups report: ${answer}`);
  }
  const list = (field: string, name: string) => {
    const value = field.replace(`${name}=`, "");
    return value === "none" ? [] : value.split(",");
  };
  return { groups: list(groups, "groups"), tools: list(tools, "tools") };
}
