/**
 * Priority lane for an embedding request on the shared global throttle.
 *
 * Retrieval (chat query) embeds jump ahead of ingestion embeds so a heavy
 * document/URL ingestion workload from one org can never starve chat search
 * for other orgs. See {@link EmbeddingsThrottleService}.
 */
export enum EmbeddingPriority {
  /** Chat query embeds — jump the queue. */
  RETRIEVAL = 'retrieval',
  /** Document/URL ingestion embeds — default lane. */
  INGESTION = 'ingestion',
}
