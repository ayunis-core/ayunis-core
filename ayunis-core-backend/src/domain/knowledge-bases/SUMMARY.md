Knowledge Bases
Document collections for organized RAG retrieval

Knowledge bases group uploaded documents into named collections that can be queried semantically. Each knowledge base belongs to an organization and user.

This module currently provides the `KnowledgeBase` domain entity (name, description, org scope, user ownership), the `KnowledgeBaseRepository` port, a local TypeORM repository implementation with mapper and record schema, and domain error definitions. Use cases and integrations with other modules will be added in subsequent PRs.
