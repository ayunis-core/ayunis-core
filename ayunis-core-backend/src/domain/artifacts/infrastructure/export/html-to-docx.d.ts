declare module 'html-to-docx' {
  function htmlToDocx(
    htmlString: string,
    headerHTMLString?: string | null,
    options?: Record<string, unknown>,
  ): Promise<Buffer>;

  export = htmlToDocx;
}
