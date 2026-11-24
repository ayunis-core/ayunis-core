/**
 * Where a document job stands, kept in the job so its next slice goes on
 * from there (what is read and indexed is in the database).
 */
export interface OparlDocumentsProgress {
  /** ISO time the job started; files that failed since are not retried by it. */
  startedAt: string;
  /** Papers, meetings and agenda items were chunked. */
  objectsIndexed: boolean;
}
