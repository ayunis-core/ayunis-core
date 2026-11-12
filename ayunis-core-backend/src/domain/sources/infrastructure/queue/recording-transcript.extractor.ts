import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import transcriptionConfig from 'src/config/transcription.config';
import type { ProcessingContext } from 'src/common/types/processing-context';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { StoredSourceFileService } from 'src/domain/sources/application/services/stored-source-file.service';
import { transcriptChunks } from 'src/domain/sources/application/util/transcript-chunks';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { TranscribeRecordingUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe-recording/transcribe-recording.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import { audioStagingRoot, withStagedJobFile } from './staged-job-file';

export interface ExtractedContent {
  text: string;
  chunks: TextSourceContentChunk[];
  /** Only for recordings that keep their transcript as timed segments. */
  segments?: TranscriptSegment[];
}

/**
 * The meeting-recording step of document processing: the transcript keeps
 * its timed speaker segments, and its chunks are whole speaker turns that
 * know their time range, instead of the text splitter's chunks.
 */
@Injectable()
export class RecordingTranscriptExtractor {
  constructor(
    private readonly storedFiles: StoredSourceFileService,
    private readonly transcribeRecordingUseCase: TranscribeRecordingUseCase,
    @Inject(transcriptionConfig.KEY)
    private readonly transcription: ConfigType<typeof transcriptionConfig>,
  ) {}

  async extract(
    data: DocumentProcessingJobData,
    processingContext?: ProcessingContext,
  ): Promise<ExtractedContent> {
    const { fileName, fileType } = data;
    const { text, segments } = await withStagedJobFile(
      this.storedFiles,
      data,
      audioStagingRoot(this.transcription),
      (recording) =>
        this.transcribeRecordingUseCase.execute(
          new TranscribeCommand({
            file: Buffer.alloc(0),
            recording,
            fileName,
            mimeType: fileType,
            processingContext,
          }),
        ),
    );
    return { text, segments, chunks: transcriptChunks(segments, fileName) };
  }
}
