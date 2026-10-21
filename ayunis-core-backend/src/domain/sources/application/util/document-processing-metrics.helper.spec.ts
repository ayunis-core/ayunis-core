import { Appsignal } from '@appsignal/nodejs';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import {
  recordDocumentProcessingSize,
  recordDocumentProcessingStages,
  recordSourceProcessingFailure,
} from './document-processing-metrics.helper';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { metrics: jest.fn() } },
}));

describe('document processing metrics', () => {
  const metrics = {
    addDistributionValue: jest.fn(),
    incrementCounter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
  });

  it('records one rounded distribution value per measured stage, tagged by file type', () => {
    recordDocumentProcessingStages(
      { download: 12.4, extraction: 3400.6, conversion: undefined },
      'docx',
    );

    expect(metrics.addDistributionValue.mock.calls).toEqual([
      [
        'document_processing_stage_duration_ms',
        12,
        { stage: 'download', file_type: 'docx' },
      ],
      [
        'document_processing_stage_duration_ms',
        3401,
        { stage: 'extraction', file_type: 'docx' },
      ],
    ]);
  });

  it('records file size and page count histograms per processed document', () => {
    recordDocumentProcessingSize(
      { fileSizeBytes: 26_214_400, pageCount: 412 },
      'pdf',
    );

    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_file_size_bytes',
      26_214_400,
      { file_type: 'pdf' },
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_page_count',
      412,
      { file_type: 'pdf' },
    );
  });

  it('counts failures by processing error code and source type', () => {
    recordSourceProcessingFailure(
      SourceProcessingErrorCode.PROCESSING_TIMEOUT,
      'file',
    );
    recordSourceProcessingFailure(undefined, 'web');

    expect(metrics.incrementCounter.mock.calls).toEqual([
      [
        'source_processing_failure_count',
        1,
        { error_code: 'PROCESSING_TIMEOUT', source_type: 'file' },
      ],
      [
        'source_processing_failure_count',
        1,
        { error_code: 'none', source_type: 'web' },
      ],
    ]);
  });

  it('never throws when the AppSignal client is unavailable', () => {
    jest.mocked(Appsignal.client.metrics).mockImplementation(() => {
      throw new Error('AppSignal not started');
    });

    expect(() =>
      recordDocumentProcessingStages({ download: 1 }, 'pdf'),
    ).not.toThrow();
    expect(() =>
      recordDocumentProcessingSize({ fileSizeBytes: 1, pageCount: 1 }, 'pdf'),
    ).not.toThrow();
    expect(() =>
      recordSourceProcessingFailure(undefined, 'file'),
    ).not.toThrow();
  });
});
