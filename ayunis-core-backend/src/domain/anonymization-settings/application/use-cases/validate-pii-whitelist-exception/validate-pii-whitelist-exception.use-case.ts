import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/anonymization-whitelist.repository';
import {
  InvalidWhitelistExceptionError,
  UnexpectedWhitelistExceptionError,
} from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { rejectWhitelistException } from 'src/domain/anonymization-settings/domain/whitelist-exception';
import type { ValidatePiiWhitelistExceptionQuery } from './validate-pii-whitelist-exception.query';

/**
 * Checks an exception against the org's current rule for its category.
 * Nothing is saved: the admin confirms the exception and saves it through the
 * whitelist endpoint.
 */
@Injectable()
export class ValidatePiiWhitelistExceptionUseCase {
  private readonly logger = new Logger(
    ValidatePiiWhitelistExceptionUseCase.name,
  );

  constructor(private readonly repository: AnonymizationWhitelistRepository) {}

  @HandleUnexpectedErrors(UnexpectedWhitelistExceptionError)
  async execute(query: ValidatePiiWhitelistExceptionQuery): Promise<void> {
    this.logger.log(
      { orgId: query.orgId, category: query.category },
      'Validating PII whitelist exception',
    );
    const entries = await this.repository.findByOrgId(query.orgId);
    const rejection = rejectWhitelistException({
      currentEntry: entries.find((entry) => entry.category === query.category),
      word: query.word,
    });
    if (rejection) {
      throw new InvalidWhitelistExceptionError(query.category, rejection);
    }
  }
}
