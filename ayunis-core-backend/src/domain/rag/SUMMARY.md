Knowledge Pipeline
Retrieval-augmented generation with text splitting and vector indexing

RAG provides the ingestion pipeline for enhancing AI context: splitting documents into chunks via configurable splitters, then indexing those chunks with embeddings for semantic search and retrieval.

The RAG module is organized into two sub-modules: **splitters** and **indexers**. Splitters handle text chunking with pluggable strategies (recursive and line-based), producing `SplitResult` entities from raw text via a handler registry. Indexers manage vector-based content storage using a parent-child index architecture where documents are split into parent and child chunks with embeddings for semantic search. Key entities include `IndexEntry`, `ParentChunk`, and `ChildChunk`. Use cases cover content ingestion, deletion, and semantic search. The indexer infrastructure uses PostgreSQL with pgvector for embedding storage. The module integrates with **models** for embedding model access, **sources** for document content to ingest, **retrievers** for content extraction before indexing, and **tools** (source_query tool) for runtime semantic search during conversations.
