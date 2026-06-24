Conversation Messages
Thread messages with typed roles and rich content

Messages represent individual conversation entries within threads, supporting user, assistant, system, and tool-result roles. Each message contains typed content blocks including text, images, thinking, tool-use, and tool-result entries.

The messages module handles storage and creation of conversation messages within threads. The abstract `Message` entity specializes into `UserMessage`, `AssistantMessage`, `SystemMessage`, and `ToolResultMessage`, each containing polymorphic `MessageContent` blocks (text, image, thinking, tool-use, tool-result). Key use cases include creating messages by role, saving streamed assistant responses, deleting messages, counting tokens, trimming messages for context windows, and cleaning up orphaned images. The `ImageContentService` manages image attachments in messages.

Domain events are defined in `application/events/`: `UserMessageCreatedEvent` (emitted when a user sends a message, includes userId, orgId, threadId, messageId) and `AssistantMessageCreatedEvent` (emitted when an assistant message is persisted, includes userId, orgId, threadId, messageId). Each event class exposes a static `EVENT_NAME` string for type-safe listener registration.

Tool results flow through the message system as follows: an assistant message contains `tool_use` content blocks (each with a unique `id`); the backend executes the tool and creates a subsequent `ToolResultMessage` containing `ToolResultMessageContent` entries, each with a `toolId` field matching the originating `tool_use` content `id`. The `ToolResultMessageContent.result` field is a string carrying tool-specific payloads — for example, the `generate_image` tool stores the generated image's UUID, while other tools may store display text or JSON. Usage metering for image generation is intentionally omitted in v1 (the existing token-centric usage system does not accommodate non-token costs; Azure billing handles image API costs directly).

The module integrates tightly with **threads** as the parent container, **storage** for persisting image content, **runs** which orchestrate message creation during AI execution, and **models** for token counting against model context limits.
