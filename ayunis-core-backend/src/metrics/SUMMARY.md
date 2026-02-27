Metrics Module
Exposes Prometheus metrics at `/metrics` with optional basic auth protection.

This module provides application-level Prometheus metrics for monitoring LLM usage, inference performance, message throughput, and user activity. It is a global module — metric providers (counters, histograms) are exported and can be injected into any other module.

**Key files:**
- `metrics.module.ts` — NestJS module wiring. Registers `PrometheusModule` at the `/metrics` path and applies `MetricsAuthMiddleware` to protect it.
- `metrics.constants.ts` — Single source of truth for metric names, label names, and the metrics endpoint path.
- `metrics-auth.middleware.ts` — NestMiddleware implementing HTTP Basic Auth for the metrics endpoint. Credentials come from `ConfigService` (`metrics.user` / `metrics.password`). Uses timing-safe comparison to prevent side-channel attacks.

**Configuration:**
- `AYUNIS_METRICS_USER` / `AYUNIS_METRICS_PASSWORD` — When both are set, the `/metrics` endpoint requires Basic Auth. When neither is set, the endpoint is open (with a warning log). Setting only one is treated as a misconfiguration — all requests are rejected until both are provided.

**Cardinality note:** The `user_id` label is included on several metrics. This is acceptable for municipal deployments (hundreds of users) but should be revisited if user count grows significantly. See the comment in `metrics.constants.ts`.
