import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import {
  DocumentExportPort,
  type LetterheadConfig,
} from 'src/domain/artifacts/application/ports/document-export.port';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

export type LetterheadSampleLanguage = 'de' | 'en';

const SAMPLES = {
  de: {
    recipient: 'Alex Beispiel<br>Musterstraße 12<br>12345 Musterstadt',
    sender:
      'Bürgerbüro<br>Telefon: 0123 456789<br>E-Mail: buergerbuero@example.org<br>Aktenzeichen: 123/456<br>Datum: 15.06.2026',
    subject: 'Bestätigung Ihres Antrags',
    greeting: 'Guten Tag Alex Beispiel,',
    body: 'vielen Dank für Ihren Antrag. Wir bestätigen den Eingang und prüfen derzeit die eingereichten Unterlagen. Sollte noch etwas fehlen, melden wir uns bei Ihnen.',
    continued:
      'Sobald die Prüfung abgeschlossen ist, erhalten Sie eine schriftliche Rückmeldung. Bei Fragen können Sie sich gerne unter Angabe des Aktenzeichens an uns wenden.',
    closing: 'Mit freundlichen Grüßen<br>Ihr Bürgerbüro',
  },
  en: {
    recipient: 'Alex Example<br>12 Sample Street<br>Exampletown AB12 3CD',
    sender:
      'Citizen Services<br>Phone: 0123 456789<br>Email: citizens@example.org<br>Reference: 123/456<br>Date: 15 June 2026',
    subject: 'Confirmation of your application',
    greeting: 'Dear Alex Example,',
    body: 'Thank you for your application. We have received it and are reviewing the documents you submitted. We will contact you if we need any further information.',
    continued:
      'We will write to you once the review is complete. If you have a question, please contact us and quote the reference number above.',
    closing: 'Kind regards,<br>Citizen Services',
  },
};

@Injectable()
export class RenderLetterheadSampleUseCase {
  private readonly logger = new Logger(RenderLetterheadSampleUseCase.name);

  constructor(private readonly documentExport: DocumentExportPort) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    letterhead: LetterheadConfig,
    typography: DocumentTypography,
    language: LetterheadSampleLanguage,
  ): Promise<Buffer> {
    this.logger.log({ language }, 'Rendering sample letter');
    const sample = SAMPLES[language];
    return this.documentExport.exportToPdf(
      `<table><tbody><tr><td><p>${sample.recipient}</p></td><td><p>${sample.sender}</p></td></tr></tbody></table>
<p><strong>${sample.subject}</strong></p><p>${sample.greeting}</p><p>${sample.body}</p>`,
      letterhead,
      typography,
      `<p>${sample.continued}</p><p>${sample.closing}</p>`,
    );
  }
}
