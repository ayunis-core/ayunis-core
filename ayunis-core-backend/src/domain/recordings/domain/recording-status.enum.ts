/** Where a recording is between upload, transcript and summary. */
export enum RecordingStatus {
  /** No audio is stored yet: the upload is running or was abandoned. */
  UPLOADING = 'uploading',
  TRANSCRIBING = 'transcribing',
  /** The transcript is ready and its summary is being generated. */
  SUMMARIZING = 'summarizing',
  /** The transcript is ready and its summary is done, generated or failed. */
  READY = 'ready',
  /** The transcription failed. */
  FAILED = 'failed',
}
