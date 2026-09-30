export enum SourceIngestionKind {
  /** First run of a PROCESSING source; settles it as READY or FAILED. */
  INITIAL = 'initial',
  /** Refresh of a READY source, which stays READY and searchable throughout. */
  REINDEX = 'reindex',
}
