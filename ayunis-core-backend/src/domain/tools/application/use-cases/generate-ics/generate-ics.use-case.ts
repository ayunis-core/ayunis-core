import { Injectable } from '@nestjs/common';
import { GenerateIcsCommand } from './generate-ics.command';
import {
  IcsMissingRequiredFieldsError,
  IcsInvalidDateFormatError,
  IcsEndBeforeStartError,
  IcsGenerationError,
} from '../../errors/tools.errors';

@Injectable()
export class GenerateIcsUseCase {
  execute(command: GenerateIcsCommand): string {
    if (!command.title || !command.startIso || !command.endIso) {
      throw new IcsMissingRequiredFieldsError(
        command.title,
        command.startIso,
        command.endIso,
      );
    }

    const startDate = new Date(command.startIso);
    const endDate = new Date(command.endIso);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new IcsInvalidDateFormatError(command.startIso, command.endIso);
    }
    if (endDate <= startDate) {
      throw new IcsEndBeforeStartError(command.startIso, command.endIso);
    }

    const uid = this.generateUid();
    const dtStamp = this.formatDate(new Date());
    const dtStart = this.formatDate(startDate);
    const dtEnd = this.formatDate(endDate);

    const rawLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ayunis//core//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${this.escape(command.title)}`,
      `DESCRIPTION:${this.escape(command.description || '')}`,
      `LOCATION:${this.escape(command.location || '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ];

    try {
      const foldedLines = rawLines.flatMap((line) => this.foldLine(line));
      return foldedLines.join('\r\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IcsGenerationError(message);
    }
  }

  private escape(input: string): string {
    return (input || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    const mm = pad(date.getUTCMonth() + 1);
    const dd = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const mi = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());

    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  }

  private generateUid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}@ayunis`;
  }

  // Fold lines to 75 octets as required by RFC 5545
  private foldLine(line: string): string[] {
    const bytes = new TextEncoder().encode(line);
    const chunks: string[] = [];
    let start = 0;

    while (start < bytes.length) {
      // 75-octet lines; continuations begin with a single space
      const end = Math.min(start + 75, bytes.length);
      const slice = bytes.slice(start, end);
      const chunk = new TextDecoder().decode(slice);
      if (start === 0) {
        chunks.push(chunk);
      } else {
        chunks.push(' ' + chunk);
      }
      start = end;
    }

    return chunks.length > 0 ? chunks : [''];
  }
}
