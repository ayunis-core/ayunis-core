import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlSystemOverviews } from 'src/domain/oparl/application/services/oparl-system-overviews.service';

@Injectable()
export class ListOparlSystemsUseCase {
  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly overviews: OparlSystemOverviews,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(): Promise<OparlSystemOverview[]> {
    return this.overviews.load(await this.systems.findAll());
  }
}
