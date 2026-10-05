/**
 * Port for extracting text from an Outlook message (.msg). Rejects with
 * UnprocessableDocumentError when the file cannot be read.
 */
export abstract class MsgParserPort {
  abstract extractText(fileData: Buffer): Promise<string>;
}
