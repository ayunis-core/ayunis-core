import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  METRICS_PATH,
  AYUNIS_TOKENS_TOTAL,
  AYUNIS_RUNS_TOTAL,
  AYUNIS_RUN_DURATION_SECONDS,
  AYUNIS_RUN_TOOL_CALLS_TOTAL,
  AYUNIS_RUN_USAGE_COLLECTIONS_TOTAL,
  AYUNIS_INFERENCE_DURATION_SECONDS,
  AYUNIS_INFERENCE_ERRORS_TOTAL,
  AYUNIS_MESSAGES_TOTAL,
  AYUNIS_USER_ACTIVITY_TOTAL,
  AYUNIS_THREAD_MESSAGE_COUNT,
  AYUNIS_TOOL_USES_TOTAL,
  AYUNIS_USER_CREATIONS_TOTAL,
  AYUNIS_MARKETPLACE_INSTALLS_TOTAL,
  LABEL_USER_ID,
  LABEL_API_KEY_ID,
  LABEL_ORG_ID,
  LABEL_MODEL,
  LABEL_PROVIDER,
  LABEL_DIRECTION,
  LABEL_ROLE,
  LABEL_ERROR_TYPE,
  LABEL_STREAMING,
  LABEL_EXECUTION_PATH,
  LABEL_OUTCOME,
  LABEL_TOOL_NAME,
  LABEL_DEPARTMENT,
  LABEL_MARKETPLACE_TYPE,
  LABEL_MARKETPLACE_SLUG,
} from './metrics.constants';
import { MetricsAuthMiddleware } from './metrics-auth.middleware';
import { MetricsController } from './metrics.controller';
import { PrometheusMetricsListener } from './listeners/prometheus-metrics.listener';

const tokensCounter = makeCounterProvider({
  name: AYUNIS_TOKENS_TOTAL,
  help: 'Total number of LLM tokens consumed',
  labelNames: [
    LABEL_USER_ID,
    LABEL_API_KEY_ID,
    LABEL_ORG_ID,
    LABEL_MODEL,
    LABEL_PROVIDER,
    LABEL_DIRECTION,
  ],
});

const runsCounter = makeCounterProvider({
  name: AYUNIS_RUNS_TOTAL,
  help: 'Total terminal runs by execution path and outcome',
  labelNames: [LABEL_EXECUTION_PATH, LABEL_OUTCOME],
});

const runDurationHistogram = makeHistogramProvider({
  name: AYUNIS_RUN_DURATION_SECONDS,
  help: 'End-to-end run duration in seconds',
  labelNames: [LABEL_EXECUTION_PATH, LABEL_OUTCOME],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});

const runToolCallsCounter = makeCounterProvider({
  name: AYUNIS_RUN_TOOL_CALLS_TOTAL,
  help: 'Settled run tool calls by execution path and outcome',
  labelNames: [LABEL_EXECUTION_PATH, LABEL_OUTCOME],
});

const runUsageCollectionsCounter = makeCounterProvider({
  name: AYUNIS_RUN_USAGE_COLLECTIONS_TOTAL,
  help: 'Settled run usage persistence attempts by execution path and outcome',
  labelNames: [LABEL_EXECUTION_PATH, LABEL_OUTCOME],
});

const inferenceDurationHistogram = makeHistogramProvider({
  name: AYUNIS_INFERENCE_DURATION_SECONDS,
  help: 'Duration of LLM inference calls in seconds',
  labelNames: [
    LABEL_MODEL,
    LABEL_PROVIDER,
    LABEL_STREAMING,
    LABEL_EXECUTION_PATH,
  ],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});

const inferenceErrorsCounter = makeCounterProvider({
  name: AYUNIS_INFERENCE_ERRORS_TOTAL,
  help: 'Total number of LLM inference errors',
  labelNames: [
    LABEL_MODEL,
    LABEL_PROVIDER,
    LABEL_ERROR_TYPE,
    LABEL_STREAMING,
    LABEL_EXECUTION_PATH,
  ],
});

const messagesCounter = makeCounterProvider({
  name: AYUNIS_MESSAGES_TOTAL,
  help: 'Total number of messages sent',
  labelNames: [LABEL_USER_ID, LABEL_ORG_ID, LABEL_ROLE],
});

const userActivityCounter = makeCounterProvider({
  name: AYUNIS_USER_ACTIVITY_TOTAL,
  help: 'Total user activity events (one per run execution)',
  labelNames: [LABEL_USER_ID, LABEL_ORG_ID],
});

const threadMessageCountHistogram = makeHistogramProvider({
  name: AYUNIS_THREAD_MESSAGE_COUNT,
  help: 'Distribution of thread message counts',
  labelNames: [LABEL_USER_ID, LABEL_ORG_ID],
  buckets: [1, 2, 5, 10, 20, 50, 100, 200],
});

const toolUsesCounter = makeCounterProvider({
  name: AYUNIS_TOOL_USES_TOTAL,
  help: 'Total number of tool invocations',
  labelNames: [LABEL_USER_ID, LABEL_ORG_ID, LABEL_TOOL_NAME],
});

const userCreationsCounter = makeCounterProvider({
  name: AYUNIS_USER_CREATIONS_TOTAL,
  help: 'Total number of user creations (registration, invite accept, admin)',
  labelNames: [LABEL_ORG_ID, LABEL_DEPARTMENT],
});

const marketplaceInstallsCounter = makeCounterProvider({
  name: AYUNIS_MARKETPLACE_INSTALLS_TOTAL,
  help: 'Total number of marketplace installs (skill or integration)',
  labelNames: [
    LABEL_USER_ID,
    LABEL_ORG_ID,
    LABEL_MARKETPLACE_TYPE,
    LABEL_MARKETPLACE_SLUG,
  ],
});

const metricProviders = [
  tokensCounter,
  runsCounter,
  runDurationHistogram,
  runToolCallsCounter,
  runUsageCollectionsCounter,
  inferenceDurationHistogram,
  inferenceErrorsCounter,
  messagesCounter,
  userActivityCounter,
  threadMessageCountHistogram,
  toolUsesCounter,
  userCreationsCounter,
  marketplaceInstallsCounter,
];

@Module({
  imports: [
    PrometheusModule.register({
      path: METRICS_PATH,
      defaultMetrics: { enabled: true },
      controller: MetricsController,
    }),
  ],
  providers: [...metricProviders, PrometheusMetricsListener],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsAuthMiddleware).forRoutes(METRICS_PATH);
  }
}
