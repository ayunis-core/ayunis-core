# Route Modules

Page components composing widgets and features for each application route.

Twelve page module groups handle authentication, chat conversations, agent management, prompt libraries, user settings, organization admin settings, and super-admin platform management. Each page follows a consistent internal structure with api/, ui/, and model/ subdirectories separating data hooks, components, and types.

The `auth/` group contains six flows: login, register, email confirmation, password forgot/reset, and invite acceptance. The `chat/` and `new-chat/` pages manage AI conversation interfaces with message streaming and agent selection. The `chats/` page lists conversation threads. The `agents/` and `agent/` pages handle AI assistant browsing and detailed configuration. The `prompts/` page provides prompt library management. User `settings/` includes account and general preferences. The `admin-settings/` group covers organization administration: model configuration, MCP integrations, team/user management, billing, and usage analytics. The `super-admin-settings/` group provides platform-wide management for the models catalog and organization oversight. Each page uses the hooks pattern—one custom hook per operation (create, update, delete)—encapsulating TanStack Query mutations with toast notifications and cache invalidation.
