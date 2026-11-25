import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { OparlObjectDetail } from 'src/domain/oparl/application/models/oparl-read';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlReadRepository } from 'src/domain/oparl/application/ports/oparl-read.repository';
import { OparlReadScopeService } from 'src/domain/oparl/application/services/oparl-read-scope.service';
import { GetOparlObjectQuery } from './get-oparl-object.query';

/** A paper, meeting, organization or person of the org's linked bodies; `null` for any other ID. */
@Injectable()
export class GetOparlObjectUseCase {
  private readonly logger = new Logger(GetOparlObjectUseCase.name);

  constructor(
    private readonly scopes: OparlReadScopeService,
    private readonly reads: OparlReadRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: GetOparlObjectQuery): Promise<OparlObjectDetail | null> {
    this.logger.log({ id: query.id }, 'Getting an OParl object');
    return this.reads.findObject(await this.scopes.resolve(), query.id);
  }
}
