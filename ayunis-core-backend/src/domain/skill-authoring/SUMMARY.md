# Skill Authoring Module

## Purpose

Rewrites a skill's trigger or instructions while the user writes the skill. `POST /skills/improve-text` takes the current form state (name, trigger, instructions) and returns a rewritten value for one field, using the other field as context. Nothing is persisted; the user decides whether to keep the suggestion.

## Why a separate module

The rewrite is a paid model call, so it must go through `InferenceUsageGuard` from `RunsModule`. `RunsModule` already imports `SkillsModule`, so the endpoint lives here, outside that cycle, and imports only `ModelsModule` and `RunsModule`.

## Key behavior

- **Model choice** (`SkillTextModelResolver`): the organization default model when the caller may use it, otherwise the caller's default, otherwise any permitted model. Anonymous-only models are never used, because anonymized placeholders would end up in the rewritten skill; when every permitted model is anonymous-only the request fails with `SKILL_TEXT_IMPROVEMENT_UNAVAILABLE` (422).
- **Usage limits**: fair-use preflight and the monetary credit check run before the model call; token usage is collected afterwards, like any other paid inference.
- **Output**: plain text without surrounding quotes. An empty answer, including one that is empty after stripping quotes, fails with `SKILL_TEXT_IMPROVEMENT_FAILED` (502) instead of clearing the field.
- **Access**: requires `MANAGE_SKILLS`.
