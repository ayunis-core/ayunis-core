import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  containsPiiToken,
  deanonymizeText,
} from 'src/common/anonymization/domain/deanonymize-text';
import { InvalidWhitelistExceptionError } from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { ValidatePiiWhitelistExceptionQuery } from 'src/domain/anonymization-settings/application/use-cases/validate-pii-whitelist-exception/validate-pii-whitelist-exception.query';
import { ValidatePiiWhitelistExceptionUseCase } from 'src/domain/anonymization-settings/application/use-cases/validate-pii-whitelist-exception/validate-pii-whitelist-exception.use-case';
import type { WhitelistExceptionRejection } from 'src/domain/anonymization-settings/domain/whitelist-exception';
import { GetThreadPiiMasksQuery } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.query';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { AddAnonymizationExceptionTool } from 'src/domain/tools/domain/tools/add-anonymization-exception-tool.entity';

/** The chat offers the confirmation card only for a result with this status. */
const PROPOSED_RESULT = JSON.stringify({
  status: 'awaiting_confirmation',
  message:
    'The admin now sees a card with the proposed exception. Nothing is saved until they confirm it there; ask them to review and confirm it.',
});

const UNKNOWN_PLACEHOLDER_MESSAGE =
  'The word contains a placeholder that does not exist in this conversation. Copy placeholders verbatim.';

const RULE_NOT_EXTENDABLE_MESSAGE =
  "The category's existing rule cannot be extended from the chat. Tell the admin to edit it in the anonymization settings.";

const REJECTION_MESSAGES: Record<WhitelistExceptionRejection, string> = {
  category_fully_exempt:
    'This category is already never masked in this organization, so there is nothing to add. Tell the admin.',
  already_exempt:
    "The organization's rule for this category already exempts this word, so there is nothing to add. Tell the admin.",
  empty: 'The word is empty.',
  too_long:
    "The category's rule would become too long with this word. Tell the admin to shorten the rule in the anonymization settings.",
  invalid_syntax: RULE_NOT_EXTENDABLE_MESSAGE,
  unsafe: RULE_NOT_EXTENDABLE_MESSAGE,
};

/**
 * Validates a proposed whitelist exception for the admin's confirmation card.
 * Placeholders are resolved to their original values first, because the
 * whitelist matches unmasked values; the values never reach the model.
 */
@Injectable()
export class AddAnonymizationExceptionToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(
    AddAnonymizationExceptionToolHandler.name,
  );

  constructor(
    private readonly getThreadPiiMasksUseCase: GetThreadPiiMasksUseCase,
    private readonly validatePiiWhitelistExceptionUseCase: ValidatePiiWhitelistExceptionUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: AddAnonymizationExceptionTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log({ threadId: context.threadId }, 'execute');
    const { category, word } = this.validateInput(tool, input);
    const resolvedWord = await this.resolvePlaceholders(context.threadId, word);
    if (containsPiiToken(resolvedWord)) {
      throw exposedError(tool, UNKNOWN_PLACEHOLDER_MESSAGE);
    }
    try {
      await this.validatePiiWhitelistExceptionUseCase.execute(
        new ValidatePiiWhitelistExceptionQuery(
          context.orgId,
          category,
          resolvedWord,
        ),
      );
    } catch (error) {
      if (error instanceof InvalidWhitelistExceptionError) {
        throw exposedError(tool, REJECTION_MESSAGES[error.reason]);
      }
      throw error;
    }
    return PROPOSED_RESULT;
  }

  private validateInput(
    tool: AddAnonymizationExceptionTool,
    input: Record<string, unknown>,
  ): ReturnType<AddAnonymizationExceptionTool['validateParams']> {
    try {
      return tool.validateParams(input);
    } catch (error) {
      throw exposedError(
        tool,
        error instanceof Error ? error.message : 'Invalid input',
      );
    }
  }

  private async resolvePlaceholders(
    threadId: UUID,
    word: string,
  ): Promise<string> {
    if (!containsPiiToken(word)) return word;
    const masks = await this.getThreadPiiMasksUseCase.execute(
      new GetThreadPiiMasksQuery(threadId),
    );
    const tokenToValue = new Map(masks.map((mask) => [mask.token, mask.value]));
    return deanonymizeText(word, tokenToValue);
  }
}

function exposedError(
  tool: AddAnonymizationExceptionTool,
  message: string,
): ToolExecutionFailedError {
  return new ToolExecutionFailedError({
    toolName: tool.name,
    exposeToLLM: true,
    message,
  });
}
