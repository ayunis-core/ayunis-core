import { z } from "zod";

/**
 * Validation schema for creating a predefined MCP integration
 * Matches CreatePredefinedIntegrationDto from the API
 */
export const createPredefinedIntegrationSchema = z.object({
  slug: z.string().min(1, "Predefined integration type is required"),
  configValues: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string(),
      }),
    )
    .optional(),
}) satisfies z.ZodType<{
  slug: string;
  configValues?: Array<{ name: string; value: string }>;
}>;

/**
 * Validation schema for creating a custom MCP integration
 * Matches CreateCustomIntegrationDto from the API
 */
export const createCustomIntegrationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  serverUrl: z.string().url("Server URL must be a valid URL"),
  authMethod: z.enum(["NO_AUTH", "CUSTOM_HEADER", "BEARER_TOKEN"]).optional(),
  authHeaderName: z.string().optional(),
  credentials: z.string().optional(),
}) satisfies z.ZodType<{
  name: string;
  serverUrl: string;
  authMethod?: "NO_AUTH" | "CUSTOM_HEADER" | "BEARER_TOKEN";
  authHeaderName?: string;
  credentials?: string;
}>;

/**
 * Validation schema for updating an MCP integration
 * Matches UpdateMcpIntegrationDto from the API
 */
export const updateIntegrationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .optional(),
  credentials: z.string().optional(),
  authHeaderName: z.string().optional(),
}) satisfies z.ZodType<{
  name?: string;
  credentials?: string;
  authHeaderName?: string;
}>;
