Conversation Messages
Thread messages with typed roles and rich content

Messages represent individual conversation entries within threads, supporting user, assistant, system, and tool-result roles. Each message contains typed content blocks including text, images, thinking, tool-use, and tool-result entries.

The messages module handles storage and creation of conversation messages within threads. The abstract `Message` entity specializes into `UserMessage`, `AssistantMessage`, `SystemMessage`, and `ToolResultMessage`, each containing polymorphic `MessageContent` blocks (text, image, thinking, tool-use, tool-result). Key use cases include creating messages by role, saving streamed assistant responses, deleting messages, counting tokens, trimming messages for context windows, and cleaning up orphaned images. The `ImageContentService` manages image attachments in messages. The module integrates tightly with **threads** as the parent container, **storage** for persisting image content, **runs** which orchestrate message creation during AI execution, and **models** for token counting against model context limits.
