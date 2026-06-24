export class GetPresignedUrlCommand {
  constructor(
    public readonly objectName: string,
    public readonly expiresIn: number,
    public readonly bucket?: string,
    /**
     * Optional override for the Content-Type the pre-signed URL will
     * serve the object with. Passed via the `response-content-type`
     * query parameter. Use this to force a known-safe content type
     * regardless of what the object was stored with, to defend against
     * active-content MIME types (e.g. image/svg+xml) being served inline.
     */
    public readonly responseContentType?: string,
    /**
     * Optional override for the Content-Disposition the pre-signed URL
     * will serve the object with. Passed via the
     * `response-content-disposition` query parameter. Example:
     * `inline; filename="image.png"` or `attachment; filename="file.bin"`.
     */
    public readonly responseContentDisposition?: string,
  ) {}
}
