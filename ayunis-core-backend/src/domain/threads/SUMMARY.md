Conversation Sessions
Conversation threads linking messages, models, and sources

Threads are conversation containers that hold message histories, bind to a language model and optional agent, and support source attachments for per-conversation RAG context enrichment.

The threads module manages conversation sessions. The `Thread` entity holds a message list, optional `PermittedLanguageModel` reference, optional agent binding, source assignments, title, and anonymous flag. `SourceAssignment` links data sources to individual threads. Key use cases include creating threads, finding threads (single, all, by org with sources), updating titles, deleting threads, adding/removing sources, generating titles via AI inference, and replacing models with user defaults. Thread title generation uses the language model to auto-summarize conversation content. The module integrates with **messages** for conversation content storage, **models** for model selection per thread, **agents** for agent-bound conversations, **sources** for attaching RAG data, **runs** which execute within thread context, and **shares** indirectly through agent sharing.
