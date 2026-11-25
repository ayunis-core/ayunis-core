import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { OparlCatalogBody } from 'src/domain/oparl/application/models/oparl-linked-body';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';

/** The catalog's bodies for the current org, marked with the org's own links. */
@Injectable()
export class ListOparlCatalogBodiesUseCase {
  private readonly logger = new Logger(ListOparlCatalogBodiesUseCase.name);

  constructor(
    private readonly links: OparlBodyLinksRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(): Promise<OparlCatalogBody[]> {
    const { orgId } = getRequiredUserContext(this.context);
    this.logger.log({ orgId }, 'Listing OParl catalog bodies');
    return this.links.findCatalog(orgId);
  }
}
