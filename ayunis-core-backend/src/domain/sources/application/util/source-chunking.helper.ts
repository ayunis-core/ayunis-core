/**
 * How a file source's text is cut into chunks. Shared by the cut of the
 * finished text and by the embedding done while the text is still arriving,
 * which only works if both cut the same way.
 */
export const SOURCE_CHUNKING = { chunkSize: 2000, chunkOverlap: 200 } as const;
