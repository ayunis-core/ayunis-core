import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { Readable } from 'stream';
import type { AdventCalendarImageDownload } from 'src/domain/advent-calendar/application/services/advent-calendar-image.service';

export function streamAdventCalendarImage(
  download: AdventCalendarImageDownload,
  res: Response,
): StreamableFile {
  res.set('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(download.stream as unknown as Readable, {
    type: download.contentType,
    disposition: `inline; filename="${download.filename}"`,
  });
}
