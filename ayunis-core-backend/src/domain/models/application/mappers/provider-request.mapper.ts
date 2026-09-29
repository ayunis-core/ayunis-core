import type {
  JsonSchema,
  ProviderRequest,
  ToolChoice,
  ToolSchema as InferenceToolSchema,
} from '@ayunis/inference';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { toInferenceMessages } from './message.mapper';

export interface ProviderRequestInput {
  messages: Message[];
  systemPrompt?: string;
  tools: ToolSchema[];
  toolChoice?: ModelToolChoice;
  orgId: string;
}

/**
 * Builds the provider-agnostic `ProviderRequest` consumed by the `@ayunis`
 * provider packages from the backend's inference input. Provider wire-format
 * (tool schema normalization, strict mode, …) is handled inside the provider
 * packages, so this mapper stays provider-agnostic.
 */
export async function toProviderRequest(
  input: ProviderRequestInput,
  imageContentService: ImageContentService,
): Promise<ProviderRequest> {
  return {
    instructions: input.systemPrompt ?? '',
    messages: await toInferenceMessages(
      input.messages,
      input.orgId,
      imageContentService,
    ),
    tools: input.tools.map(toInferenceToolSchema),
    ...(input.toolChoice !== undefined && input.tools.length > 0
      ? { toolChoice: toInferenceToolChoice(input.toolChoice) }
      : {}),
  };
}

function toInferenceToolSchema(tool: ToolSchema): InferenceToolSchema {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as unknown as JsonSchema,
  };
}

// eslint-disable-next-line sonarjs/function-return-type -- ToolChoice is intentionally a string | object union
function toInferenceToolChoice(toolChoice: ModelToolChoice): ToolChoice {
  switch (toolChoice) {
    case ModelToolChoice.AUTO:
      return 'auto';
    case ModelToolChoice.REQUIRED:
      return 'required';
    default:
      // A value outside the enum is a specific tool name: the OpenAI-compat
      // surface forwards `tool_choice.function.name` as the toolChoice string
      // (see openai-request.mapper.ts `toModelToolChoice`).
      return { tool: toolChoice };
  }
}
