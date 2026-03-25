External Integrations
Prometheus metrics and outbound webhook delivery for external system integration.

The integrations module groups infrastructure that connects Ayunis Core to external systems. It imports two self-contained sub-modules — `metrics/` and `webhooks/` — but does not export either; both operate via event-driven listeners that subscribe to domain events emitted by use cases, so no domain or IAM code depends on this module directly.

`metrics/` exposes Prometheus counters and histograms for monitoring LLM inference, message throughput, and user activity at `/metrics` with optional basic auth. All metric providers are internal to the module; `PrometheusMetricsListener` handles domain events and records the corresponding metrics.

`webhooks/` delivers lifecycle events (org, user, and subscription changes) as outbound HTTP POST calls to a configured URL using a port/adapter pattern. All providers are internal to the module; `WebhookDispatchListener` handles domain events and dispatches them as webhook HTTP calls.

Both sub-modules are designed to never disrupt core business operations — metric recording and webhook delivery failures are caught and logged without re-throwing.
