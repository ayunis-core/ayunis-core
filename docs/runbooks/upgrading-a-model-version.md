# Upgrading a model version (AYC-1705)

Use this when a provider ships a newer version of a language model that a catalog
model already offers, for example `gpt-5.4` → `gpt-5.5`.

## What stays stable

Every catalog language model has an **alias**: the model ID of the
OpenAI-compatible API (`/api/openai-compat/v1/models` lists it,
`/v1/chat/completions` accepts it as `model` and returns it in `model`). The API
does not accept the provider name.

Threads, permits, org/team/user defaults, team grants and Auto/Max entries all
reference the catalog model's ID. Editing the catalog model in place therefore
moves API clients, chats and defaults to the new version at once, without any
change on their side.

## Steps

1. Super Admin → Model catalog → edit the language model.
2. Change **Name** to the provider's new model or deployment name.
3. Update capabilities, context window size and prices if they changed.
4. Keep **Alias** unchanged.
5. Save. The provider client is cached per model revision, so the next request
   already uses the new name.
6. Check one chat and one API request (`model` = alias) against the model.

## Don't

- **Don't create a new catalog model and archive the old one.** An archived
  model disappears from the API (its alias returns 404) and existing chats on it
  can no longer be continued. Archiving switches a model off; it is not an
  upgrade path. An archived model keeps its alias reserved.
- **Never swap an embedding model in place.** Existing vectors were produced by
  the old model; a different embedding model makes retrieval silently wrong.
  Embedding and image-generation models have no alias.
- **Don't change an alias casually.** Clients that use the old alias get 404
  `OPENAI_COMPAT_MODEL_NOT_FOUND` immediately. Aliases are unique across the whole catalog,
  so the old alias can only be reused after the change.

## Consequences to expect

- Usage history shows the current provider name for past usage of the model.
  Costs stay correct because each usage row stores its own cost.
- Capability, context-window and price changes reach API clients on the same
  alias without notice.
- Not verified yet: before the first real swap of an Azure reasoning model,
  continue an existing thread with stored reasoning items on staging and confirm
  the provider accepts the replayed encrypted reasoning from the old version.

## Initial aliases

The migration `AddAliasToLanguageModels` set `alias = name` for every existing
language model, so existing integrations kept working. If the same name existed
under several providers, the non-archived, oldest model kept the name and the
others got `<name>-<provider>` (or `<name>-<id>` if that was already another model's name).
