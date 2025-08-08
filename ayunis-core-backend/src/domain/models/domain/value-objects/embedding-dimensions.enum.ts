/**
 * !! IMPORTANT !!
 * This enum is used to represent the dimensions of an embedding.
 * It is used to determine which column to use in the database
 * of the child_chunks table in the parent_child_indexer.
 * If you add new dimensions, you need to update the database schema
 * and the parent_child_indexer repository.
 */
export enum EmbeddingDimensions {
  DIMENSION_1024 = 1024,
  DIMENSION_1536 = 1536,
}
