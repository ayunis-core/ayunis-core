import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import {
  RenderLetterheadSampleUseCase,
  type LetterheadSampleLanguage,
} from 'src/domain/artifacts/application/use-cases/render-letterhead-sample/render-letterhead-sample.use-case';
import { LetterheadInvalidPdfError } from 'src/domain/letterheads/application/letterheads.errors';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { GetDocumentDefaultsUseCase } from 'src/domain/letterheads/application/use-cases/get-document-defaults/get-document-defaults.use-case';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';
import type { PageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';

interface PreviewLetterheadCommand extends Partial<DocumentTypography> {
  letterheadId?: UUID;
  firstPagePdf?: Buffer;
  continuationPagePdf?: Buffer;
  removeContinuationPage?: boolean;
  firstPageMargins: PageMargins;
  continuationPageMargins: PageMargins;
  language: LetterheadSampleLanguage;
}

@Injectable()
export class PreviewLetterheadUseCase {
  private readonly logger = new Logger(PreviewLetterheadUseCase.name);

  constructor(
    private readonly findLetterhead: FindLetterheadUseCase,
    private readonly getDocumentDefaults: GetDocumentDefaultsUseCase,
    private readonly downloadObject: DownloadObjectUseCase,
    private readonly pdfs: LetterheadPdfService,
    private readonly renderSample: RenderLetterheadSampleUseCase,
  ) {}

  async execute(command: PreviewLetterheadCommand): Promise<Buffer> {
    this.logger.log(
      { letterheadId: command.letterheadId },
      'Previewing letterhead',
    );
    const saved = command.letterheadId
      ? await this.findLetterhead.execute(
          new FindLetterheadQuery({
            letterheadId: command.letterheadId,
          }),
        )
      : undefined;
    const [pdfs, defaults] = await Promise.all([
      this.resolvePdfs(command, saved),
      this.getDocumentDefaults.execute(),
    ]);
    const fontFamily =
      command.fontFamily === undefined ? saved?.fontFamily : command.fontFamily;
    const fontSizePt =
      command.fontSizePt === undefined ? saved?.fontSizePt : command.fontSizePt;
    return this.renderSample.execute(
      {
        ...pdfs,
        firstPageMargins: command.firstPageMargins,
        continuationPageMargins: command.continuationPageMargins,
      },
      {
        fontFamily: fontFamily ?? defaults.fontFamily,
        fontSizePt: fontSizePt ?? defaults.fontSizePt,
      },
      command.language,
    );
  }

  private async resolvePdfs(
    command: PreviewLetterheadCommand,
    saved?: Letterhead,
  ) {
    const [firstPagePdf, continuationPagePdf] = await Promise.all([
      this.resolvePdf(
        command.firstPagePdf,
        saved?.firstPageStoragePath,
        'first page',
      ),
      this.resolvePdf(
        command.continuationPagePdf,
        command.removeContinuationPage
          ? null
          : saved?.continuationPageStoragePath,
        'continuation page',
      ),
    ]);
    if (!firstPagePdf) {
      throw new LetterheadInvalidPdfError('First page PDF is required');
    }

    return { firstPagePdf, continuationPagePdf };
  }

  private async resolvePdf(
    selected: Buffer | undefined,
    storagePath: string | null | undefined,
    label: string,
  ): Promise<Buffer | undefined> {
    if (selected) {
      await this.pdfs.validateSinglePagePdf(selected, label);
      return selected;
    }
    if (storagePath) {
      return buffer(
        await this.downloadObject.execute(
          new DownloadObjectCommand(storagePath),
        ),
      );
    }
    return undefined;
  }
}
