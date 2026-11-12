import { Injectable } from '@nestjs/common';
import type { ThreadSourceCitation } from 'src/domain/runs/application/use-cases/get-thread-source-citation/get-thread-source-citation.use-case';
import {
  SourceCitationRecordingPosition,
  type SourceCitationRecordingResponseDto,
  type SourceCitationResponseDto,
} from 'src/domain/runs/presenters/http/dto/source-citation-response.dto';

@Injectable()
export class SourceCitationResponseMapper {
  toDto(citation: ThreadSourceCitation): SourceCitationResponseDto {
    return {
      chunk: citation.chunk,
      source: citation.source,
      recording: citation.recording && this.toRecordingDto(citation.recording),
    };
  }

  private toRecordingDto(
    recording: NonNullable<ThreadSourceCitation['recording']>,
  ): SourceCitationRecordingResponseDto {
    const { position } = recording;
    const base = {
      id: recording.id,
      name: recording.name,
      uploadedAt: recording.uploadedAt,
    };
    if (position.kind === 'summary') {
      return {
        ...base,
        position: SourceCitationRecordingPosition.SUMMARY,
        start: null,
        end: null,
        speakerNumbers: [],
      };
    }
    return {
      ...base,
      position: SourceCitationRecordingPosition.TRANSCRIPT,
      start: position.start,
      end: position.end,
      speakerNumbers: position.speakerNumbers,
    };
  }
}
