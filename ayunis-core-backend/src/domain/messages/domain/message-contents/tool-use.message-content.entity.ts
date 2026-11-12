import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { sanitizeObject } from 'src/common/util/unicode-sanitizer';
import type { ProviderMetadata } from './provider-metadata.type';

export interface ToolUseIntegration {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface ToolUseStream {
  status: 'streaming' | 'invalid';
  argumentsJson: string;
}

export class ToolUseMessageContent extends MessageContent {
  public id: string;
  public name: string;
  public params: Record<string, unknown>;
  public readonly providerMetadata: ProviderMetadata;
  public readonly integration?: ToolUseIntegration;
  public readonly stream?: ToolUseStream;
  /**
   * The call was held for the user's confirmation instead of running. It
   * awaits confirmation while no tool result answers it; the result that
   * does records the user's decision.
   */
  public readonly requiresConfirmation: boolean;

  constructor(
    id: string,
    name: string, // Not ToolNames because we want to allow org custom tools
    params: Record<string, unknown>,
    providerMetadata: ProviderMetadata = null,
    integration?: ToolUseIntegration,
    stream?: ToolUseStream,
    requiresConfirmation = false,
  ) {
    super(MessageContentType.TOOL_USE);
    this.id = id;
    this.name = name;
    // Sanitize params to handle invalid Unicode escape sequences in nested strings
    this.params = sanitizeObject(params);
    this.providerMetadata = providerMetadata;
    this.integration = integration;
    this.stream = stream;
    this.requiresConfirmation = requiresConfirmation;
  }
}
