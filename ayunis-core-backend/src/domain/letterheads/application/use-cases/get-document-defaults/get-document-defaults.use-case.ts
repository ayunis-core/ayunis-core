import { Injectable } from '@nestjs/common';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentDefaultsRepository } from 'src/domain/letterheads/application/ports/document-defaults.repository';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

@Injectable()
export class GetDocumentDefaultsUseCase {
  constructor(
    private readonly repository: DocumentDefaultsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<DocumentTypography> {
    const orgId = getRequiredOrgId(this.contextService);
    return (
      (await this.repository.findByOrgId(orgId)) ?? {
        fontFamily: null,
        fontSizePt: null,
      }
    );
  }
}
