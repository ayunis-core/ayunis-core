import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { DocumentDefaultsRepository } from 'src/domain/letterheads/application/ports/document-defaults.repository';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';
import { DocumentDefaultsRecord } from './schema/document-defaults.record';

@Injectable()
export class LocalDocumentDefaultsRepository extends DocumentDefaultsRepository {
  constructor(
    @InjectRepository(DocumentDefaultsRecord)
    private readonly repository: Repository<DocumentDefaultsRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<DocumentTypography | null> {
    return this.repository.findOne({
      where: { orgId },
      select: { fontFamily: true, fontSizePt: true },
    });
  }

  async upsert(
    orgId: UUID,
    { fontFamily, fontSizePt }: Partial<DocumentTypography>,
  ): Promise<DocumentTypography> {
    const supplied = {
      ...(fontFamily !== undefined && { fontFamily }),
      ...(fontSizePt !== undefined && { fontSizePt }),
    };
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .values({ orgId, ...supplied })
      .orUpdate(Object.keys(supplied), ['orgId'])
      .returning(['fontFamily', 'fontSizePt'])
      .execute();

    const [typography] = result.raw as DocumentTypography[];
    return typography;
  }
}
