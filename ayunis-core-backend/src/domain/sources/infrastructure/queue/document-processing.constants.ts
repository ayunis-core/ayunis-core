export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';
/**
 * Lane for recordings and large documents, which run for minutes. They get
 * their own slots so they cannot occupy the ones small documents wait for.
 */
export const LARGE_DOCUMENT_PROCESSING_QUEUE = 'large-document-processing';
