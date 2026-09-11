import type { APIRequestContext } from "@playwright/test";
import type {
  CreateCustomIntegrationDto,
  McpIntegrationResponseDto,
  SetUserConfigDto,
  UpdateMcpIntegrationDto,
  UserConfigResponseDto,
} from "../generated/ayunisCoreAPI.schemas";
import { generatedApi } from "./generated-api";

export function createCustomIntegration(
  api: APIRequestContext,
  data: CreateCustomIntegrationDto,
): Promise<McpIntegrationResponseDto> {
  return generatedApi.mcpIntegrationsControllerCreateCustom(data, { api });
}

export function getIntegration(
  api: APIRequestContext,
  integrationId: string,
): Promise<McpIntegrationResponseDto> {
  return generatedApi.mcpIntegrationsControllerGetById(integrationId, {
    api,
  });
}

export function updateIntegration(
  api: APIRequestContext,
  integrationId: string,
  data: UpdateMcpIntegrationDto,
): Promise<McpIntegrationResponseDto> {
  return generatedApi.mcpIntegrationsControllerUpdate(integrationId, data, {
    api,
  });
}

export function setUserIntegrationConfig(
  api: APIRequestContext,
  integrationId: string,
  data: SetUserConfigDto,
): Promise<UserConfigResponseDto> {
  return generatedApi.mcpIntegrationsControllerSetUserConfig(
    integrationId,
    data,
    { api },
  );
}

export function getUserIntegrationConfig(
  api: APIRequestContext,
  integrationId: string,
): Promise<UserConfigResponseDto> {
  return generatedApi.mcpIntegrationsControllerGetUserConfig(integrationId, {
    api,
  });
}
