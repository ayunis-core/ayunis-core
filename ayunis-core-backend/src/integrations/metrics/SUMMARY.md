Metrics Module
Exposes Prometheus metrics at `/metrics` with optional basic auth protection.

This module provides application-level Prometheus metrics for monitoring LLM usage, inference performance, message throughput, and user activity. Metrics are recorded by `PrometheusMetricsListener`, which subscribes to domain events emitted by use cases — no domain or IAM code imports from this module directly.

**Key files:**

- `metrics.module.ts` — NestJS module wiring. Registers `PrometheusModule` at the `/metrics` path with a custom controller and applies `MetricsAuthMiddleware` to protect it. Counter/histogram providers are internal to the module.
- `metrics.controller.ts` — Custom `PrometheusController` subclass decorated with `@Public()` so all global guards (JWT, EmailConfirm, Roles, Subscription, RateLimit) skip this endpoint. Actual protection is handled by `MetricsAuthMiddleware`.
- `metrics.constants.ts` — Single source of truth for metric names, label names, and the metrics endpoint path.
- `metrics.utils.ts` — Shared helper: `safeMetric()` wraps metric operations in try/catch to prevent metric failures from crashing business flows.
- `classify-inference-error.helper.ts` — Pure classification function that maps inference errors to Prometheus-friendly `error_type` label values (timeout, rate_limit, server_error, etc.).
- `listeners/prometheus-metrics.listener.ts` — Central listener that subscribes to all domain events (user created, messages, runs, inference, tokens, tools, threads) and records the corresponding Prometheus counters/histograms.
- `metrics-auth.middleware.ts` — NestMiddleware implementing HTTP Basic Auth for the metrics endpoint. Credentials come from `ConfigService` (`metrics.user` / `metrics.password`). Uses timing-safe comparison to prevent side-channel attacks.

**Architecture:**

Use cases emit domain events → `PrometheusMetricsListener` handles them → records Prometheus metrics. This decouples business logic from observability infrastructure. Domain and IAM modules have no dependency on `prom-client` or `@willsoto/nestjs-prometheus`.

**Configuration:**

- `AYUNIS_METRICS_USER` / `AYUNIS_METRICS_PASSWORD` — When both are set, the `/metrics` endpoint requires Basic Auth. When neither is set, the endpoint is open (with a warning log). Setting only one is treated as a misconfiguration — all requests are rejected until both are provided.

**Cardinality note:** The `user_id` label is included on several metrics. This is acceptable for municipal deployments (hundreds of users) but should be revisited if user count grows significantly. See the comment in `metrics.constants.ts`.
