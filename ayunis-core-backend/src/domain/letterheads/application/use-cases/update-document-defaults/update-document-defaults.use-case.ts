import { Injectable } from '@nestjs/common';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentDefaultsRepository } from 'src/domain/letterheads/application/ports/document-defaults.repository';
import { GetDocumentDefaultsUseCase } from 'src/domain/letterheads/application/use-cases/get-document-defaults/get-document-defaults.use-case';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

@Injectable()
export class UpdateDocumentDefaultsUseCase {
  constructor(
    private readonly repository: DocumentDefaultsRepository,
    private readonly contextService: ContextService,
    private readonly getDocumentDefaults: GetDocumentDefaultsUseCase,
  ) {}

  async execute({
    fontFamily,
    fontSizePt,
  }: Partial<DocumentTypography>): Promise<DocumentTypography> {
    if (fontFamily === undefined && fontSizePt === undefined) {
      return this.getDocumentDefaults.execute();
    }

    const orgId = getRequiredOrgId(this.contextService);
    return this.repository.upsert(orgId, { fontFamily, fontSizePt });
  }
}
