import { modelsConfig } from './models.config';
import { authenticationConfig } from './authentication.config';
import { typeormConfig } from './typeorm.config';
import { embeddingsConfig } from './embeddings.config';
import storageConfig from './storage.config';
import { webConfig } from './web.config';
import { appConfig } from './app.config';
import { legalConfig } from './legal.config';
import { subscriptionsConfig } from './subscriptions.config';
import { emailsConfig } from './emails.config';
import internetSearchConfig from './internet-search.config';
import { mcpConfig } from './mcp.config';
import { marketplaceConfig } from './marketplace.config';
import toolsConfig from './tools.config';
import { featuresConfig } from './features.config';
import { metricsConfig } from './metrics.config';
import { redisConfig } from './redis.config';
import { gotenbergConfig } from './gotenberg.config';
import { retentionConfig } from './retention.config';

/**
 * Config factories for every Nest entrypoint's ConfigModule.forRoot.
 *
 * Which namespaces a bootstrap needs is determined by its transitive module
 * graph, which an entrypoint author cannot see — e.g. the admin CLI pulls in
 * UsersModule/InvitesModule, whose JwtModule factories getOrThrow
 * 'auth.jwt.secret'. Every entrypoint (AppModule, CliModule, future workers)
 * must load this same list instead of hand-picking namespaces, so a config
 * read cannot fail in one bootstrap context while working in another.
 */
export const rootConfigs = [
  modelsConfig,
  authenticationConfig,
  typeormConfig,
  embeddingsConfig,
  storageConfig,
  webConfig,
  appConfig,
  legalConfig,
  subscriptionsConfig,
  emailsConfig,
  internetSearchConfig,
  mcpConfig,
  marketplaceConfig,
  toolsConfig,
  featuresConfig,
  metricsConfig,
  redisConfig,
  gotenbergConfig,
  retentionConfig,
];
