# Agent runtime monitoring

All chat runs use `@ayunis/agent-runtime`. The run, tool, and usage metrics retain the bounded `execution_path` and `outcome` labels so dashboards remain continuous with rollout-era data. Existing inference metrics also retain provider, configurable model name, error class, and streaming labels. None of these metrics includes user, organization, thread, run, or model IDs.

Structured AppSignal logs provide the high-cardinality, per-run detail that must not become Prometheus labels. They correlate a run and its iterations without recording prompts, messages, tool inputs, tool results, retrieved content, or secrets.

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
- **Model request starts:** `message:"Agent model request started"`
- **Model request completions:** `message:"Agent model request completed"`
- **Tool call starts:** `message:"Agent tool call started"`
- **Tool call completions:** `message:"Agent tool call completed"`
- **Tool failures:** `message:"Run tool call failed"`
- **Usage collection failures:** `message:"Usage collection failed"`
- **Critical runtime finalization failures:** `message:"Critical agent runtime finalization hook failed"`
- **Best-effort runtime finalization failures:** `message:"Best-effort agent runtime finalization hook failed"`

Every detailed latency log carries `run_id`, `request_id`, `model`, `provider`, `environment`, and `iteration`. A model retry gets a new `request_id` and retains the same `iteration_request_id`, `run_id`, and `iteration`. Terminal logs use the run ID as their request ID and `iteration=null`.

Model-completion logs provide:

- `request_started_at`, `first_provider_chunk_at`, `first_visible_text_at`, and `completed_at`;
- `time_to_first_provider_chunk_ms`, `time_to_first_visible_text_ms`, `run_elapsed_to_first_provider_chunk_ms`, `run_elapsed_to_first_visible_text_ms`, and `duration_ms`;
- `outcome`, `attempt`, and a safe `error_code` when available;
- `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_write_input_tokens`, and `thinking_tokens` when the provider reports them.

Missing timing or usage fields mean the milestone or provider value was not observed; they are not zero. `thinking_tokens` is a breakdown of provider-reported output usage and must not be added to `output_tokens` when calculating total tokens.
OpenAI's unadjusted cache-write count can overlap its cache-read prefix; the adapter reports only the newly written, non-overlapping remainder as `cache_write_input_tokens` so the three input columns remain additive.

Tool-completion logs provide `tool_call_id`, `tool_name`, `started_at`, `completed_at`, `duration_ms`, and `outcome` (`success`, `error`, or `aborted`). They deliberately omit tool input and result payloads. Finalization logs carry `execution_path=agent_runtime`, hook name, criticality, and the original outcome. Provider incidents inherit the request trace; correlate them with the Prometheus inference-error series by execution path.

### Per-run comparison view

Create an AppSignal Logs saved view in the target environment with this query:

```text
message:("Agent model request completed" OR "Agent tool call completed" OR "Run reached terminal outcome")
```

Add columns for `timestamp`, `message`, `run_id`, `request_id`, `iteration`, `model`, `provider`, `outcome`, `duration_ms`, both `run_elapsed_to_first_*` fields, both `time_to_first_*` fields, and all five token fields. Filter `run_id` to one reproduced run, and sort by `timestamp` ascending.

For one run, derive the comparison values as follows:

| Measurement                         | Source                                                  |
| ----------------------------------- | ------------------------------------------------------- |
| Time to first provider chunk        | First observed `run_elapsed_to_first_provider_chunk_ms` |
| Time to first visible text          | First observed `run_elapsed_to_first_visible_text_ms`   |
| Model time                          | Sum `duration_ms` from model-completion logs            |
| Tool time                           | Sum `duration_ms` from tool-completion logs             |
| Total completion time               | Terminal log `duration_ms`                              |
| Other orchestration and persistence | Total completion minus model time minus tool time       |
| Per-iteration context/output growth | Model-completion token columns grouped by `iteration`   |

The residual is useful for detecting orchestration or persistence regressions, but it is not exclusively database time because preparation, hook execution, event delivery, and final persistence are all included.

For the AYC-949 comparison, execute the reference prompt three times in one explicitly named environment, record the three `run_id` values, and attach the median of each run-level measurement plus the per-iteration table to the Linear issue. Do not combine staging and production runs in one median.

Modern AppSignal structured attributes are returned under the log line's `.json` field. An empty legacy `attributes` field in `appsignal-cli` does not mean these fields are absent.
