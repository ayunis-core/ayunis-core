/** Word, Excel and PowerPoint files are ZIP packages unless encrypted. */
const OFFICE_OPEN_XML_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
/**
 * The compound file an encrypted Office Open XML package is wrapped in
 * ([MS-OFFCRYPTO]), e.g. by a Purview sensitivity label that applies
 * encryption; SharePoint hands it to an app without usage rights as it is.
 */
const COMPOUND_FILE_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

export const PROTECTED_FILE_HEAD_BYTES = COMPOUND_FILE_SIGNATURE.length;

/**
 * Whether a download of `contentType` (SharePoint sends the type of the file
 * name's extension) starting with `head` is an encrypted Office document.
 */
export function isProtectedOfficeFile(
  contentType: string | null,
  head: Buffer,
): boolean {
  const type = contentType?.split(';')[0].trim().toLowerCase();
  return (
    type !== undefined &&
    OFFICE_OPEN_XML_TYPES.has(type) &&
    head
      .subarray(0, COMPOUND_FILE_SIGNATURE.length)
      .equals(COMPOUND_FILE_SIGNATURE)
  );
}
