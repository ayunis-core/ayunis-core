// Re-export from the usage module, which is the new owner of this event.
// Retained here so existing importers (prometheus metrics listener, etc.)
// do not need to change.
export { TokensConsumedEvent } from 'src/domain/usage/application/events/tokens-consumed.event';
