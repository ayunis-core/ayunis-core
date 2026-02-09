Prompt Library
Reusable prompt templates organized per user account

Prompts lets users create, store, update, and delete reusable text templates for conversations. Each prompt has a title and content, scoped to the owning user for quick insertion into threads.

The prompts module provides a personal prompt library for each user. The single domain entity `Prompt` holds a title, content body, and user ownership reference. Use cases cover the full CRUD lifecycle: creating prompts, retrieving a single prompt or all prompts by user, updating prompt title and content, and deleting prompts. The repository port abstracts persistence, with a local PostgreSQL implementation using TypeORM. The HTTP controller exposes RESTful endpoints with DTO validation. The module integrates with **shares** for organization-wide prompt sharing, allowing users to publish prompts to their org. It is a self-contained, lightweight module with minimal cross-module dependencies, primarily consumed by the frontend prompt picker in conversation views.
