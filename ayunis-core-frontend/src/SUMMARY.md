# AI Gateway

Frontend architecture for AI-powered public administration conversational platform.

This React 19 frontend follows Feature-Sliced Design architecture with clear layer separation: app initialization, pages, widgets, features, and shared primitives. It uses TanStack Router/Query, Orval-generated API client, shadcn/ui components, Tailwind CSS v4, and i18next for German/English internationalization.

The application implements a Feature-Sliced Design (FSD) inspired architecture organizing code into strict dependency layers. The `app/` layer handles routing via TanStack Router with auto-generated route trees. The `pages/` layer contains route-level modules for chat, agents, prompts, authentication, user settings, admin settings, and super-admin management—each following a consistent api/ui/model internal structure. The `widgets/` layer provides reusable composite components like the app sidebar, chat input, markdown renderer, and chart visualizations. The `features/` layer encapsulates cross-cutting business logic including theme switching, language selection, model provider management, and usage analytics. The `shared/` layer houses shadcn/ui primitives, Orval-generated TypeScript API hooks, i18n locale files, and utility libraries. Six layout components (app, chat-interface, content-area, full-screen-message, onboarding, root) structure the visual hierarchy.
