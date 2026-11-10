import { GotenbergConverterService } from './gotenberg-converter.service';
import {
  DocumentConversionTimeoutError,
  DocumentConverterBusyError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

// Needs a Gotenberg started with --api-timeout=5s
// --libreoffice-max-queue-size=1 --libreoffice-restart-after=1; the status
// codes and bodies the converter classifies exist only in the real service.
const gotenbergUrl = process.env.GOTENBERG_CONTRACT_URL;
const describeGotenberg = gotenbergUrl ? describe : describe.skip;

function documentSlowerThanTheTimeLimit(): Buffer {
  const rows = Array.from(
    { length: 20_000 },
    (_, row) => `<tr><td>${row}</td><td>Lorem ipsum dolor sit amet</td></tr>`,
  ).join('');
  return Buffer.from(`<html><body><table>${rows}</table></body></html>`);
}

describeGotenberg('GotenbergConverterService against real Gotenberg', () => {
  const service = new GotenbergConverterService({
    url: gotenbergUrl ?? '',
    maxConcurrentConversions: 2,
  });
  const convertSlowDocument = () =>
    service.convertToPdf(documentSlowerThanTheTimeLimit(), 'slow.html');
  const convertSmallDocument = () =>
    service.convertToPdf(Buffer.from('hello'), 'small.txt');

  it('fails a document that exceeds the time limit as a timeout and converts the next one', async () => {
    await expect(convertSlowDocument()).rejects.toBeInstanceOf(
      DocumentConversionTimeoutError,
    );

    const pdf = await convertSmallDocument();
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  }, 30_000);

  it('reports a replica that is converting another document as busy', async () => {
    const inFlight = convertSlowDocument().catch((error: unknown) => error);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(convertSmallDocument()).rejects.toBeInstanceOf(
      DocumentConverterBusyError,
    );
    await inFlight;
  }, 30_000);
});
