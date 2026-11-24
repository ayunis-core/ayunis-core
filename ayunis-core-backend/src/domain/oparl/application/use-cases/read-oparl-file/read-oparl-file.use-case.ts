import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type {
  OparlFileContent,
  OparlFileReading,
} from 'src/domain/oparl/application/models/oparl-read';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlReadRepository } from 'src/domain/oparl/application/ports/oparl-read.repository';
import { OparlReadScopeService } from 'src/domain/oparl/application/services/oparl-read-scope.service';
import { ReadOparlFileQuery } from './read-oparl-file.query';

/** Characters of text per call, as `source_get_text` returns at most. */
export const OPARL_READ_MAX_CHARACTERS = 20_000;
const MAX_PAGES = 50;

/**
 * A file of the org's linked bodies with as many of its pages, from
 * `fromPage` on, as fit one result; `null` for any other ID.
 */
@Injectable()
export class ReadOparlFileUseCase {
  private readonly logger = new Logger(ReadOparlFileUseCase.name);

  constructor(
    private readonly scopes: OparlReadScopeService,
    private readonly reads: OparlReadRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: ReadOparlFileQuery): Promise<OparlFileReading | null> {
    this.logger.log(
      { fileId: query.fileId, fromPage: query.fromPage },
      'Reading an OParl file',
    );
    const content = await this.reads.readFile(
      await this.scopes.resolve(),
      query.fileId,
      query.fromPage,
      MAX_PAGES,
    );
    return content && fitPages(content);
  }
}

function fitPages(content: OparlFileContent): OparlFileReading {
  const pages: OparlFileReading['pages'] = [];
  let characters = 0;
  for (const page of content.pages) {
    if (characters + page.text.length <= OPARL_READ_MAX_CHARACTERS) {
      pages.push(page);
      characters += page.text.length;
      continue;
    }
    // A page longer than the budget is cut rather than never read.
    if (pages.length === 0) {
      pages.push({
        number: page.number,
        text: page.text.slice(0, OPARL_READ_MAX_CHARACTERS),
        truncated: true,
      });
    }
    break;
  }
  const last = pages.at(-1)?.number;
  const lastPage = Math.max(
    content.pageCount ?? 0,
    content.pages.at(-1)?.number ?? 0,
  );
  const nextPage = last !== undefined && last < lastPage ? last + 1 : null;
  return {
    ...content,
    pages,
    nextPage,
  };
}
