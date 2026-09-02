# Agent runtime monitoring

All chat runs use `@ayunis/agent-runtime`. The run, tool, and usage metrics retain the bounded `execution_path` and `outcome` labels so dashboards remain continuous with rollout-era data. Existing inference metrics also retain provider, configurable model name, error class, and streaming labels. None of these metrics includes user, organization, thread, run, or model IDs.

## Prometheus queries

### Run count by execution path

```promql
sum by (execution_path) (increase(ayunis_runs_total[1h]))
```

### Terminal outcomes by execution path

```promql
sum by (execution_path, outcome) (increase(ayunis_runs_total[1h]))
```

### Application-error rate by execution path

```promql
(
  sum by (execution_path) (
    rate(ayunis_runs_total{outcome="error"}[5m])
  )
  or on (execution_path)
  0 * sum by (execution_path) (rate(ayunis_runs_total[5m]))
)
/
sum by (execution_path) (rate(ayunis_runs_total[5m]))
```

`max_iterations` is intentionally separate from application errors.

### p95 end-to-end duration by execution path

```promql
histogram_quantile(
  0.95,
  sum by (le, execution_path) (
    rate(ayunis_run_duration_seconds_bucket[5m])
  )
)
```

### Provider failures by execution path

```promql
sum by (execution_path, provider) (
  increase(ayunis_inference_errors_total[1h])
)
or on (execution_path, provider)
0 * sum by (execution_path, provider) (
  increase(ayunis_inference_duration_seconds_count[1h])
)
```

For the failure-class breakdown, use:

```promql
sum by (execution_path, provider, error_type) (
  increase(ayunis_inference_errors_total[1h])
)
```

### Tool failures by execution path

```promql
sum by (execution_path) (
  increase(ayunis_run_tool_calls_total{outcome="error"}[1h])
)
or on (execution_path)
0 * sum by (execution_path) (
  increase(ayunis_run_tool_calls_total[1h])
)
```

### Usage collection failures by execution path

```promql
sum by (execution_path) (
  increase(ayunis_run_usage_collections_total{outcome="error"}[1h])
)
or on (execution_path)
0 * sum by (execution_path) (
  increase(ayunis_run_usage_collections_total[1h])
)
```

## AppSignal queries

Use these named structured-log searches and filter or group on the JSON attribute `execution_path` (`agent_runtime` for all new runs):

- **Terminal outcomes:** `message:"Run reached terminal outcome"`
- **Tool failures:** `message:"Run tool call failed"`
- **Usage collection failures:** `message:"Usage collection failed"`
- **Critical runtime finalization failures:** `message:"Critical agent runtime finalization hook failed"`
- **Best-effort runtime finalization failures:** `message:"Best-effort agent runtime finalization hook failed"`

Terminal logs also carry `outcome`, `duration_ms`, and a safe `error_code` when available. Finalization logs carry `execution_path=agent_runtime`, hook name, criticality, and the original outcome. Provider incidents inherit the request trace; correlate them with the Prometheus inference-error series by execution path.

Modern AppSignal structured attributes are returned under the log line's `.json` field. An empty legacy `attributes` field in `appsignal-cli` does not mean these fields are absent.
