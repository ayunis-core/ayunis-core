import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { PreviewLetterheadUseCase } from './preview-letterhead.use-case';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { createPageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';

const letterheadId = randomUUID();
const margins = createPageMargins({ top: 45, bottom: 20, left: 25, right: 20 });
const first = Buffer.from('first-page');
const continuation = Buffer.from('continuation');
const replacement = Buffer.from('replacement');

function setup() {
  const download = {
    execute: jest.fn(async ({ objectName }: { objectName: string }) =>
      Readable.from([objectName === 'first' ? first : continuation]),
    ),
  };
  const find = {
    execute: jest.fn(
      async () =>
        ({
          firstPageStoragePath: 'first',
          continuationPageStoragePath: 'continuation',
          fontFamily: 'Arial',
          fontSizePt: 11,
        }) as Letterhead,
    ),
  };
  const renderer = { execute: jest.fn(async () => Buffer.from('sample PDF')) };
  const pdfs = { validateSinglePagePdf: jest.fn(async () => undefined) };
  const defaults = {
    execute: jest.fn(async () => ({ fontFamily: 'Georgia', fontSizePt: 10 })),
  };
  const useCase = new PreviewLetterheadUseCase(
    find as never,
    defaults as never,
    download as never,
    pdfs as never,
    renderer as never,
  );
  return { useCase, find, download, renderer, pdfs };
}

const layout = {
  firstPageMargins: margins,
  continuationPageMargins: { ...margins, top: 55 },
  language: 'en' as const,
};

describe('PreviewLetterheadUseCase', () => {
  it('applies a new background and current margins before the letterhead is saved', async () => {
    const { useCase, find, renderer } = setup();

    const result = await useCase.execute({
      ...layout,
      firstPagePdf: replacement,
    });

    expect(result).toEqual(Buffer.from('sample PDF'));
    expect(find.execute).not.toHaveBeenCalled();
    expect(renderer.execute).toHaveBeenCalledWith(
      {
        firstPagePdf: replacement,
        firstPageMargins: margins,
        continuationPageMargins: layout.continuationPageMargins,
      },
      { fontFamily: 'Georgia', fontSizePt: 10 },
      'en',
    );
  });

  it('uses the saved first file and a replacement continuation and resolves overrides independently', async () => {
    const { useCase, download, renderer, pdfs } = setup();

    await useCase.execute({
      ...layout,
      letterheadId,
      continuationPagePdf: replacement,
      fontFamily: null,
    });

    expect(download.execute).toHaveBeenCalledTimes(1);
    expect(pdfs.validateSinglePagePdf).toHaveBeenCalledWith(
      replacement,
      'continuation page',
    );
    expect(renderer.execute).toHaveBeenCalledWith(
      {
        firstPagePdf: first,
        continuationPagePdf: replacement,
        firstPageMargins: margins,
        continuationPageMargins: layout.continuationPageMargins,
      },
      { fontFamily: 'Georgia', fontSizePt: 11 },
      'en',
    );
  });

  it('reuses the first background when removing a saved continuation', async () => {
    const { useCase, download, renderer } = setup();

    await useCase.execute({
      ...layout,
      letterheadId,
      removeContinuationPage: true,
    });

    expect(download.execute).toHaveBeenCalledTimes(1);
    expect(renderer.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        firstPagePdf: first,
        continuationPagePdf: undefined,
      }),
      { fontFamily: 'Arial', fontSizePt: 11 },
      'en',
    );
  });

  it('does not render if a selected PDF fails upload validation', async () => {
    const { useCase, renderer, pdfs } = setup();
    pdfs.validateSinglePagePdf.mockRejectedValueOnce(new Error('Invalid PDF'));

    await expect(
      useCase.execute({ ...layout, firstPagePdf: replacement }),
    ).rejects.toThrow();
    expect(renderer.execute).not.toHaveBeenCalled();
  });
});
