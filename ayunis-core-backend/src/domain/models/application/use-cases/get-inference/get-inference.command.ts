import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { ToolSchema } from '../../../../tools/domain/tool.entity';
import type { ModelToolChoice } from '../../../domain/value-objects/model-tool-choice.enum';
import type { Message } from 'src/domain/messages/domain/message.entity';

export class GetInferenceCommand {
  model: LanguageModel;
  messages: Message[];
  /**
   * Tools the LLM can call. Persisted `Tool` entities (from agents, skills,
   * MCP integrations) and ad-hoc inline definitions supplied by transport-
   * layer callers (the OpenAI-compat endpoint) both satisfy `ToolSchema` —
   * the inference layer doesn't need to distinguish.
   */
  tools: ToolSchema[];
  toolChoice: ModelToolChoice;
  instructions?: string;

  constructor(params: {
    model: LanguageModel;
    messages: Message[];
    tools: ToolSchema[];
    toolChoice: ModelToolChoice;
    instructions?: string;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.tools = params.tools;
    this.toolChoice = params.toolChoice;
    this.instructions = params.instructions;
  }
}
