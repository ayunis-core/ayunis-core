import type { UploadedFileRef } from 'src/common/util/source-file-upload';

export class StartFileSourceProcessingCommand {
  constructor(
    public readonly file: UploadedFileRef,
    /**
     * Called with the number of sources the file will create before any of
     * them exist (a workbook creates one per data sheet). Lets the caller
     * reject an over-capacity upload with its own limit error while
     * rejection is still free.
     */
    public readonly ensureCapacityFor?: (sourceCount: number) => void,
  ) {}
}
