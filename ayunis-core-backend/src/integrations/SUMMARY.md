External Integrations
Prometheus metrics and outbound webhook delivery for external system integration.

The integrations module groups infrastructure that connects Ayunis Core to external systems. It contains two sub-modules: `metrics/` exposes Prometheus counters and histograms for monitoring LLM inference, message throughput, and user activity at `/metrics` with optional basic auth; `webhooks/` delivers lifecycle events (org, user, and subscription changes) as outbound HTTP POST calls to a configured URL using a port/adapter pattern. Both sub-modules are designed to never disrupt core business operations — metric recording and webhook delivery failures are caught and logged without re-throwing.
