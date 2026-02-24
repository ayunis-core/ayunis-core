import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeObject } from 'src/common/util/unicode-sanitizer';
import type { ProviderMetadata } from './provider-metadata.type';

export interface ToolUseIntegration {
  id: string;
  name: string;
  logoUrl: string | null;
}

export class ToolUseMessageContent extends MessageContent {
  public id: string;
  public name: string;
  public params: Record<string, unknown>;
  public readonly providerMetadata: ProviderMetadata;
  public readonly integration?: ToolUseIntegration;

  constructor(
    id: string,
    name: string, // Not ToolNames because we want to allow org custom tools
    params: Record<string, unknown>,
    providerMetadata: ProviderMetadata = null,
    integration?: ToolUseIntegration,
  ) {
    super(MessageContentType.TOOL_USE);
    this.id = id;
    this.name = name;
    // Sanitize params to handle invalid Unicode escape sequences in nested strings
    this.params = sanitizeObject(params);
    this.providerMetadata = providerMetadata;
    this.integration = integration;
  }
}
