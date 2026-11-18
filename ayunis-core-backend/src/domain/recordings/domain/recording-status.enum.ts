/** Where a recording is between upload and transcript. */
export enum RecordingStatus {
  /** No audio is stored yet: the upload is running or was abandoned. */
  UPLOADING = 'uploading',
  TRANSCRIBING = 'transcribing',
  TRANSCRIBED = 'transcribed',
  FAILED = 'failed',
}
