Data Sources
External data sources for RAG context enrichment

Sources manage user-uploaded files, URLs, and text content that feed the RAG pipeline. Each source is chunked, indexed, and made available for semantic search during AI conversations.

The sources module manages external data that enriches AI context through RAG. The abstract `Source` entity specializes into `TextSource` (direct text with URL or content) and `DataSource` (uploaded files with storage references). `TextSourceContentChunk` represents indexed content fragments. Key use cases include creating text and data sources, querying text sources semantically, retrieving source details, and deleting sources (single or bulk). Sources track their creator (user or system) and support assignment to both agents and threads. The module integrates with **rag** for content ingestion and vector indexing, **retrievers** for extracting text from files and URLs, **storage** for file persistence in MinIO, **agents** for source assignment to AI assistants, and **threads** for per-conversation source attachment enabling contextual document queries.
