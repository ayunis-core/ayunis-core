import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  METRICS_PATH,
  AYUNIS_TOKENS_TOTAL,
  AYUNIS_INFERENCE_DURATION_SECONDS,
  AYUNIS_INFERENCE_ERRORS_TOTAL,
  AYUNIS_MESSAGES_TOTAL,
  AYUNIS_USER_ACTIVITY_TOTAL,
  AYUNIS_THREAD_MESSAGE_COUNT,
  LABEL_USER_ID,
  LABEL_ORG_ID,
  LABEL_MODEL,
  LABEL_PROVIDER,
  LABEL_DIRECTION,
  LABEL_ROLE,
  LABEL_ERROR_TYPE,
  LABEL_STREAMING,
} from './metrics.constants';
import { MetricsAuthMiddleware } from './metrics-auth.middleware';

const tokensCounter = makeCounterProvider({
  name: AYUNIS_TOKENS_TOTAL,
  help: 'Total number of LLM tokens consumed',
  labelNames: [
    LABEL_USER_ID,
    LABEL_ORG_ID,
    LABEL_MODEL,
    LABEL_PROVIDER,
    LABEL_DIRECTION,
  ],
});

const inferenceDurationHistogram = makeHistogramProvider({
  name: AYUNIS_INFERENCE_DURATION_SECONDS,
  help: 'Duration of LLM inference calls in seconds',
  labelNames: [LABEL_MODEL, LABEL_PROVIDER, LABEL_STREAMING],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});

const inferenceErrorsCounter = makeCounterProvider({
  name: AYUNIS_INFERENCE_ERRORS_TOTAL,
  help: 'Total number of LLM inference errors',
  labelNames: [LABEL_MODEL, LABEL_PROVIDER, LABEL_ERROR_TYPE, LABEL_STREAMING],
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

const metricProviders = [
  tokensCounter,
  inferenceDurationHistogram,
  inferenceErrorsCounter,
  messagesCounter,
  userActivityCounter,
  threadMessageCountHistogram,
];

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: METRICS_PATH,
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: metricProviders,
  exports: metricProviders,
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsAuthMiddleware).forRoutes(METRICS_PATH);
  }
}
