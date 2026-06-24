/** Minimal JSON Schema shape; tools declare their parameters with it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** The schema-only view of a tool — what gets sent to the model. */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: JsonSchema;
}
