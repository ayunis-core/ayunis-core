Conversation Messages
Thread messages with typed roles and rich content

Messages represent individual conversation entries within threads, supporting user, assistant, system, and tool-result roles. Each message contains typed content blocks including text, images, thinking, tool-use, and tool-result entries.

The messages module owns message creation, persistence, and image storage. `Message` specializes into user, assistant, system, and tool-result entities with typed content blocks. Tool-use content may carry a transient SSE stream envelope; that envelope is never persisted. Use cases create messages, save assistant responses, delete history, estimate thread size, and clean up orphaned images. The runs module owns complete-turn selection.

Assistant and tool-result persistence treats a messages-to-thread foreign-key violation as an expected no-op when the thread disappears during inference. Other tool-result persistence failures remain `MESSAGE_CREATION_FAILED`.

Upload policy lives in `application/utils/image-upload.policy.ts`. `CreateUserMessageCommand` rejects unsupported MIME types, mismatched byte signatures, and images above the strictest supported provider ceiling. Signature sniffing checks the header, not whether the whole payload can be decoded. The current raw-byte upload ceiling is 3,932,160 bytes. `ImageContentService.loadImage` validates the declared type and retains the legacy 10 MiB stored-image limit so older uploads remain readable. The inference mapper sends stored bytes unchanged; this PR does not repair older images that exceed a provider's limit.

`CountMessagesTokensUseCase` supplies an approximate long-chat warning using the shared estimator and batched text counting. `toBudgetParts` includes each image's reference label and fixed token cost. Runtime trimming uses the actual provider estimator and fixed request overhead, so its budget remains authoritative. The domain exposes image reference IDs; `image-reference-label.util.ts` owns the prompt label shared by mapping and estimation.

Domain events are defined in `application/events/`: `UserMessageCreatedEvent` (emitted when a user sends a message, includes userId, orgId, threadId, messageId) and `AssistantMessageCreatedEvent` (emitted when an assistant message is persisted, includes userId, orgId, threadId, messageId). Each event class exposes a static `EVENT_NAME` string for type-safe listener registration.

Tool results flow through the message system as follows: an assistant message contains `tool_use` content blocks (each with a unique `id`); the backend executes the tool and creates a subsequent `ToolResultMessage` containing `ToolResultMessageContent` entries, each with a `toolId` field matching the originating `tool_use` content `id`. The `ToolResultMessageContent.result` field is a string carrying tool-specific payloads — for example, the `generate_image` tool stores the generated image's UUID, while other tools may store display text or JSON. Usage metering for image generation is intentionally omitted in v1 (the existing token-centric usage system does not accommodate non-token costs; Azure billing handles image API costs directly).

The module integrates tightly with **threads** as the parent container, **storage** for persisting image content, **runs** which orchestrate message creation during AI execution, and **models** for token counting against model context limits.
