/** Where a file's bytes live on local disk, with the hash taken while it was written. */
export interface LocalFile {
  path: string;
  size: number;
  sha256: string;
}

export class File {
  constructor(
    public readonly fileData: Buffer,
    public readonly filename: string,
    public readonly fileType: string,
    /** Set when the bytes are on disk; `fileData` is then empty. */
    public readonly local?: LocalFile,
  ) {}
}
