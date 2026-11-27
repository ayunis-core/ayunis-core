import { request as apiRequest } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import type {
  AdventCalendarResponseDto,
  SaveAdventCalendarDoorRequestDto,
} from "../generated/ayunisCoreAPI.schemas";
import { generatedApi } from "./generated-api";
import { login } from "./auth.client";

/** The seeded super admin; the advent calendar is platform-wide. */
export async function createSuperAdminApi(): Promise<APIRequestContext> {
  const api = await apiRequest.newContext({ baseURL: config.apiURL });
  await login(api, "admin@demo.local", "admin");
  return api;
}

export async function setAdventCalendarEnabled(
  superAdminApi: APIRequestContext,
  enabled: boolean,
): Promise<void> {
  await generatedApi.superAdminAdventCalendarControllerSetEnabled(
    { enabled },
    { api: superAdminApi },
  );
}

export async function saveAdventCalendarDoor(
  superAdminApi: APIRequestContext,
  day: number,
  door: SaveAdventCalendarDoorRequestDto,
): Promise<void> {
  await generatedApi.superAdminAdventCalendarControllerSaveDoor(day, door, {
    api: superAdminApi,
  });
}

// Raw multipart request: the generated client builds a browser FormData,
// which Playwright's request context does not send as multipart.
export async function uploadAdventCalendarDoorImage(
  superAdminApi: APIRequestContext,
  day: number,
  png: Buffer,
): Promise<void> {
  const response = await superAdminApi.put(
    `${config.apiURL}/api/super-admin/advent-calendar/doors/${day}/image`,
    {
      multipart: {
        file: { name: "door.png", mimeType: "image/png", buffer: png },
      },
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Uploading the image of door ${day} failed (HTTP ${response.status()}): ${await response.text()}`,
    );
  }
}

export async function clearAdventCalendarDoor(
  superAdminApi: APIRequestContext,
  day: number,
): Promise<void> {
  await generatedApi.superAdminAdventCalendarControllerClearDoor(day, {
    api: superAdminApi,
  });
}

export function getAdventCalendar(
  api: APIRequestContext,
): Promise<AdventCalendarResponseDto> {
  return generatedApi.adventCalendarControllerGetCalendar({ api });
}

export function requestAdventCalendarDoorImage(
  api: APIRequestContext,
  day: number,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/advent-calendar/doors/${day}/image`);
}
