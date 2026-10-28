import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ValidateMcpIntegrationCommand } from './validate-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';

/**
 * Result of MCP integration validation
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  toolCount?: number;
  resourceCount?: number;
  promptCount?: number;
}

@Injectable()
export class ValidateMcpIntegrationUseCase {
  private readonly logger = new Logger(ValidateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: ValidateMcpIntegrationCommand,
  ): Promise<ValidationResult> {
    this.logger.log(
      {
        id: command.integrationId,
      },
      'validateMcpIntegration',
    );

    try {
      const orgId = this.getOrgIdOrThrow();
      const integration = await this.getIntegrationOrThrow(
        command.integrationId,
      );

      this.ensureOrgAccess(integration, orgId);

      return await this.validateCapabilities(
        integration,
        command.integrationId,
      );
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        {
          id: command.integrationId,
          err: error as Error,
        },
        'unexpectedError',
      );
      throw new UnexpectedMcpError(
        'Unexpected error occurred during validation',
      );
    }
  }

  private async validateCapabilities(
    integration: McpIntegration,
    integrationId: UUID,
  ): Promise<ValidationResult> {
    const result = await this.collectCapabilities(integration, integrationId);
    if (result.kind === 'failure') {
      return { isValid: false, errorMessage: result.error };
    }

    const toolCount = result.tools.length;
    const resourceCount =
      result.resources.length + result.resourceTemplates.length;
    const promptCount = result.prompts.length;
    if (toolCount + resourceCount + promptCount === 0) {
      const errorMessage = 'No capabilities found on MCP server';
      this.logger.warn(
        { id: integrationId, error: errorMessage },
        'validationFailed',
      );
      return { isValid: false, errorMessage };
    }

    this.logger.log(
      { id: integrationId, toolCount, resourceCount, promptCount },
      'validationSucceeded',
    );
    return { isValid: true, toolCount, resourceCount, promptCount };
  }

  private getOrgIdOrThrow(): UUID {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return orgId;
  }

  private async getIntegrationOrThrow(
    integrationId: UUID,
  ): Promise<McpIntegration> {
    const integration = await this.repository.findById(integrationId);

    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    return integration;
  }

  private ensureOrgAccess(integration: McpIntegration, orgId: UUID): void {
    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(
        integration.id,
        integration.name,
      );
    }
  }

  private async collectCapabilities(
    integration: McpIntegration,
    integrationId: UUID,
  ): Promise<
    | {
        kind: 'success';
        tools: unknown[];
        resources: unknown[];
        resourceTemplates: unknown[];
        prompts: unknown[];
      }
    | { kind: 'failure'; error: string }
  > {
    const results = await Promise.allSettled(
      this.createCapabilityRequests(integration),
    );
    const [toolsResult, resourcesResult, templatesResult, promptsResult] =
      results;
    const criticalFailure = results.find((result) =>
      this.isCriticalFailure(result),
    );

    if (criticalFailure) {
      const errorMessage = this.extractErrorMessage(criticalFailure.reason);

      this.logger.warn(
        {
          id: integrationId,
          error: errorMessage,
        },
        'validationFailed',
      );

      return {
        kind: 'failure',
        error: errorMessage,
      };
    }

    return {
      kind: 'success',
      tools: this.extractArray(toolsResult),
      resources: this.extractArray(resourcesResult),
      resourceTemplates: this.extractArray(templatesResult),
      prompts: this.extractArray(promptsResult),
    };
  }

  private createCapabilityRequests(
    integration: McpIntegration,
  ): [
    Promise<unknown[]>,
    Promise<unknown[]>,
    Promise<unknown[]>,
    Promise<unknown[]>,
  ] {
    return [
      this.mcpClientService.listTools(integration),
      this.mcpClientService.listResources(integration),
      this.mcpClientService.listResourceTemplates(integration),
      this.mcpClientService.listPrompts(integration),
    ];
  }

  private isCriticalFailure(
    result: PromiseSettledResult<unknown[]>,
  ): result is PromiseRejectedResult {
    return (
      result.status === 'rejected' && !this.isMethodMissingError(result.reason)
    );
  }

  private isMethodMissingError(reason: unknown): boolean {
    if (!reason || typeof reason !== 'object') {
      return false;
    }

    const message = this.extractMessage(reason);
    const code = (reason as { code?: unknown }).code;

    return message.includes('Method not found') || code === -32601;
  }

  private extractArray(result: PromiseSettledResult<unknown[]>): unknown[] {
    return result.status === 'fulfilled' ? result.value : [];
  }

  private extractErrorMessage(reason: unknown): string {
    const message = this.extractMessage(reason);

    if (message.trim()) {
      return message;
    }

    return 'Connection failed';
  }

  private extractMessage(reason: unknown): string {
    if (reason instanceof Error) {
      return reason.message;
    }

    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as { message?: unknown }).message;

      if (typeof message === 'string') {
        return message;
      }
    }

    return '';
  }
}
