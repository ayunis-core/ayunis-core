# Agent runtime rollout

`FEATURE_AGENT_RUNTIME_ENABLED` routes chat runs through `@ayunis/agent-runtime`. It defaults to `false`; changing it requires a deployment. Do not enable production before the earlier environments are verified.

## Rollout and rollback

Enable and verify in this order:

1. staging
2. internal
3. production

For rollback, set `FEATURE_AGENT_RUNTIME_ENABLED=false`, redeploy, and repeat the verification request below. A rollback is not verified merely because the deployment configuration says `false`; check the effective application value.

```bash
curl -fsS https://<backend>/api/feature-toggles \
  | jq '.agentRuntimeEnabled'
```

The response must be `true` after enablement and `false` after rollback.

## Prometheus rollout queries

The new run, tool, and usage rollout metrics use only bounded `execution_path` and `outcome` labels. Existing inference metrics retain provider, configurable model name, error class, and streaming labels and gain `execution_path`. None of these changes adds user, organization, thread, run, or model IDs.

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

## AppSignal rollout queries

Use these named structured-log searches and filter or group on the JSON attribute `execution_path` (`legacy` or `agent_runtime`):

- **Terminal outcomes:** `message:"Run reached terminal outcome"`
- **Tool failures:** `message:"Run tool call failed"`
- **Usage collection failures:** `message:"Usage collection failed"`
- **Critical runtime finalization failures:** `message:"Critical agent runtime finalization hook failed"`
- **Best-effort runtime finalization failures:** `message:"Best-effort agent runtime finalization hook failed"`

Terminal logs also carry `outcome`, `duration_ms`, and a safe `error_code` when available. Finalization logs carry `execution_path=agent_runtime`, hook name, criticality, and the original outcome. Provider incidents inherit the request trace; compare their Prometheus inference-error series by execution path for the rollout decision.

Modern AppSignal structured attributes are returned under the log line's `.json` field. An empty legacy `attributes` field in `appsignal-cli` does not mean these fields are absent.
