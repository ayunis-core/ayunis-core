import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import {
  isOparlSystemObject,
  systemMetadata,
} from 'src/domain/oparl/domain/oparl-system-object';
import { normalizeOparlSystemUrl } from 'src/domain/oparl/domain/oparl-system-url';
import type { OparlSystemOverview } from 'src/domain/oparl/application/models/oparl-system-overview';
import { OparlClientPort } from 'src/domain/oparl/application/ports/oparl-client.port';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  InvalidOparlSystemUrlError,
  NotAnOparlSystemError,
  OparlInvalidResponseError,
  OparlSystemAlreadyExistsError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlPageWriter } from 'src/domain/oparl/application/services/oparl-page-writer.service';
import { OparlSystemOverviews } from 'src/domain/oparl/application/services/oparl-system-overviews.service';
import { AddOparlSystemCommand } from './add-oparl-system.command';

const MAX_BODY_PAGES = 100;

/**
 * Adds a system to the catalog by its URL, which must lead (also through
 * redirects) to an OParl `System` on a public host. Its bodies are
 * discovered right away and its initial import queued; if queueing fails,
 * the schedule takes it, as it is due.
 */
@Injectable()
export class AddOparlSystemUseCase {
  private readonly logger = new Logger(AddOparlSystemUseCase.name);

  constructor(
    private readonly client: OparlClientPort,
    private readonly systems: OparlSystemsRepository,
    private readonly writer: OparlPageWriter,
    private readonly jobs: OparlSyncJobsPort,
    private readonly overviews: OparlSystemOverviews,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(command: AddOparlSystemCommand): Promise<OparlSystemOverview> {
    const url = normalizeOparlSystemUrl(command.url);
    if (!url) throw new InvalidOparlSystemUrlError();
    this.logger.log({ url }, 'Adding OParl system');
    if (await this.systems.existsWithUrl(url))
      throw new OparlSystemAlreadyExistsError(url);
    const object = await this.client.fetchObject(url, { retry: false });
    if (!isOparlSystemObject(object)) throw new NotAnOparlSystemError(url);
    const bodies = await this.readBodies(object.body);
    const system = new OparlSystem({ url, ...systemMetadata(object) });
    await this.persist(system, bodies);
    await this.jobs.enqueue([system.id]).catch((error: unknown) => {
      this.logger.warn(
        { systemId: system.id, err: error as Error },
        'Could not queue the initial import; the schedule takes it',
      );
    });
    const [overview] = await this.overviews.load([system]);
    return overview;
  }

  private async readBodies(url: string): Promise<unknown[]> {
    const items: unknown[] = [];
    let next: string | null = url;
    let pages = 0;
    while (next) {
      if (++pages > MAX_BODY_PAGES)
        throw new OparlInvalidResponseError(url, 'body list does not end');
      const result = await this.client.fetchPage(next, { retry: false });
      items.push(...result.data);
      next = result.nextUrl;
    }
    return items;
  }

  @Transactional()
  private async persist(system: OparlSystem, bodies: unknown[]): Promise<void> {
    if (!(await this.systems.createIfAbsent(system)))
      throw new OparlSystemAlreadyExistsError(system.url);
    await this.writer.writeBodies(system.id, bodies, null);
  }
}
