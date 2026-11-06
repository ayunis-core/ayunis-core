/**
 * Which consumer ingests the file. Tables become per-sheet CSV data sources
 * for threads and skills, but knowledge bases flatten them into one searchable
 * text source through the document pipeline.
 */
export enum SourceUploadPipeline {
  DOCUMENT = 'document',
  DATA_SOURCE = 'data_source',
}
