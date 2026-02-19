import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { ValidateMcpIntegrationCommand } from './validate-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpIntegration } from '../../../domain/mcp-integration.entity';

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
    this.logger.log('validateMcpIntegration', {
      id: command.integrationId,
    });

    try {
      const orgId = this.getOrgIdOrThrow();
      const userId = this.contextService.get('userId');
      const integration = await this.getIntegrationOrThrow(
        command.integrationId,
      );

      this.ensureOrgAccess(integration, orgId);

      const capabilityResult = await this.collectCapabilities(
        integration,
        command.integrationId,
        userId,
      );

      if (capabilityResult.kind === 'failure') {
        return {
          isValid: false,
          errorMessage: capabilityResult.error,
        };
      }

      const { tools, resources, resourceTemplates, prompts } = capabilityResult;
      const toolCount = tools.length;
      const resourceCount = resources.length + resourceTemplates.length;
      const promptCount = prompts.length;
      const totalCapabilities = toolCount + resourceCount + promptCount;

      if (totalCapabilities === 0) {
        const errorMessage = 'No capabilities found on MCP server';

        this.logger.warn('validationFailed', {
          id: command.integrationId,
          error: errorMessage,
        });

        return {
          isValid: false,
          errorMessage,
        };
      }

      this.logger.log('validationSucceeded', {
        id: command.integrationId,
        toolCount,
        resourceCount,
        promptCount,
      });

      return {
        isValid: true,
        toolCount,
        resourceCount,
        promptCount,
      };
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error('unexpectedError', {
        id: command.integrationId,
        error: error as Error,
      });
      throw new UnexpectedMcpError(
        'Unexpected error occurred during validation',
      );
    }
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
    userId?: UUID,
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
    const requests: [
      Promise<unknown[]>,
      Promise<unknown[]>,
      Promise<unknown[]>,
      Promise<unknown[]>,
    ] = [
      this.mcpClientService.listTools(integration, userId),
      this.mcpClientService.listResources(integration, userId),
      this.mcpClientService.listResourceTemplates(integration, userId),
      this.mcpClientService.listPrompts(integration, userId),
    ];

    const [toolsResult, resourcesResult, templatesResult, promptsResult] =
      await Promise.allSettled(requests);

    let criticalFailure: PromiseRejectedResult | undefined;

    for (const result of [
      toolsResult,
      resourcesResult,
      templatesResult,
      promptsResult,
    ]) {
      if (this.isCriticalFailure(result)) {
        criticalFailure = result;
        break;
      }
    }

    if (criticalFailure) {
      const errorMessage = this.extractErrorMessage(criticalFailure.reason);

      this.logger.warn('validationFailed', {
        id: integrationId,
        error: errorMessage,
      });

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
      return reason.message ?? '';
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
