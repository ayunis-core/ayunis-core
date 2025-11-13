import { forwardRef, Module } from '@nestjs/common';
import { ModelsController } from './presenters/http/models.controller';
import { SuperAdminModelsController } from './presenters/http/super-admin-models.controller';
import { MistralInferenceHandler } from './infrastructure/inference/mistral.inference';
import { InferenceHandlerRegistry } from './application/registry/inference-handler.registry';
import { ModelRegistry } from './application/registry/model.registry';
import { ModelProvider } from './domain/value-objects/model-provider.enum';
import { OpenAIInferenceHandler } from './infrastructure/inference/openai.inference';
import { AnthropicInferenceHandler } from './infrastructure/inference/anthropic.inference';
import { MockInferenceHandler } from './infrastructure/inference/mock.inference';
import { MockStreamInferenceHandler } from './infrastructure/stream-inference/mock.stream-inference';
import { GetInferenceUseCase } from './application/use-cases/get-inference/get-inference.use-case';
import { GetAvailableModelsUseCase } from './application/use-cases/get-available-models/get-available-models.use-case';
import { GetDefaultModelUseCase } from './application/use-cases/get-default-model/get-default-model.use-case';
import { GetPermittedModelUseCase } from './application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { GetPermittedModelsUseCase } from './application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { IsModelPermittedUseCase } from './application/use-cases/is-model-permitted/is-model-permitted.use-case';
import { ModelResponseDtoMapper } from './presenters/http/mappers/model-response-dto.mapper';
import { ModelWithConfigResponseDtoMapper } from './presenters/http/mappers/model-with-config-response-dto.mapper';
import { CatalogModelResponseDtoMapper } from './presenters/http/mappers/catalog-model-response-dto.mapper';
import { LocalPermittedModelsRepositoryModule } from './infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalUserDefaultModelsRepositoryModule } from './infrastructure/persistence/local-user-default-models/local-user-default-models-repository.module';
import { LocalModelsRepositoryModule } from './infrastructure/persistence/local-models/local-models-repository.module';
import { CreatePermittedModelUseCase } from './application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { DeletePermittedModelUseCase } from './application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { StreamInferenceUseCase } from './application/use-cases/stream-inference/stream-inference.use-case';
import { StreamInferenceHandlerRegistry } from './application/registry/stream-inference-handler.registry';
import { AnthropicStreamInferenceHandler } from './infrastructure/stream-inference/anthropic.stream-inference';
import { OpenAIStreamInferenceHandler } from './infrastructure/stream-inference/openai.stream-inference';
import { ManageUserDefaultModelUseCase } from './application/use-cases/manage-user-default-model/manage-user-default-model.use-case';
import { DeleteUserDefaultModelUseCase } from './application/use-cases/delete-user-default-model/delete-user-default-model.use-case';
import { GetUserDefaultModelUseCase } from './application/use-cases/get-user-default-model/get-user-default-model.use-case';
import { GetOrgDefaultModelUseCase } from './application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { ManageOrgDefaultModelUseCase } from './application/use-cases/manage-org-default-model/manage-org-default-model.use-case';
import { MessageRequestDtoMapper } from './presenters/http/mappers/message-request-dto.mapper';
import { MistralStreamInferenceHandler } from './infrastructure/stream-inference/mistral.stream-inference';
import { CreateLanguageModelUseCase } from './application/use-cases/create-language-model/create-language-model.use-case';
import { CreateEmbeddingModelUseCase } from './application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { UpdateLanguageModelUseCase } from './application/use-cases/update-language-model/update-language-model.use-case';
import { UpdateEmbeddingModelUseCase } from './application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { GetModelUseCase } from './application/use-cases/get-model/get-model.use-case';
import { GetModelByIdUseCase } from './application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { GetAllModelsUseCase } from './application/use-cases/get-all-models/get-all-models.use-case';
import { DeleteModelUseCase } from './application/use-cases/delete-model/delete-model.use-case';

import { ModelProviderInfoRegistry } from './application/registry/model-provider-info.registry';
import { GetModelProviderInfoUseCase } from './application/use-cases/get-model-provider-info/get-model-provider-info.use-case';
import { ModelProviderInfoResponseDtoMapper } from './presenters/http/mappers/model-provider-info-response-dto.mapper';
import { CreatePermittedProviderUseCase } from './application/use-cases/create-permitted-provider/create-permitted-provider.use-case';
import { DeletePermittedProviderUseCase } from './application/use-cases/delete-permitted-provider/delete-permitted-provider.use-case';
import { GetAllPermittedProvidersUseCase } from './application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';
import { PermittedProviderResponseDtoMapper } from './presenters/http/mappers/permitted-provider-response-dto.mapper';
import { LocalPermittedProvidersRepositoryModule } from './infrastructure/persistence/local-permitted-providers/local-permitted-providers-repository.module';
import { GetAllModelProviderInfosWithPermittedStatusUseCase } from './application/use-cases/get-all-model-provider-infos-with-permitted-status/get-all-model-provider-infos-with-permitted-status.use-case';
import { ModelProviderWithPermittedStatusResponseDtoMapper } from './presenters/http/mappers/model-provider-with-permitted-status-response-dto.mapper';
import { ThreadsModule } from '../threads/threads.module';
import { AgentsModule } from '../agents/agents.module';
import { DeleteUserDefaultModelsByModelIdUseCase } from './application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { LegalAcceptancesModule } from 'src/iam/legal-acceptances/legal-acceptances.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { IsProviderPermittedUseCase } from './application/use-cases/is-provider-permitted/is-provider-permitted.use-case';
import { LocalOllamaInferenceHandler } from './infrastructure/inference/local-ollama.inference';
import { LocalOllamaStreamInferenceHandler } from './infrastructure/stream-inference/local-ollama.stream-inference';
import { SynaforceInferenceHandler } from './infrastructure/inference/synaforce.inference';
import { SynaforceStreamInferenceHandler } from './infrastructure/stream-inference/synaforce.stream-inference';
import { GetPermittedLanguageModelsUseCase } from './application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelUseCase } from './application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedEmbeddingModelUseCase } from './application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { UsersModule } from 'src/iam/users/users.module';
import { SourcesModule } from '../sources/sources.module';
import { IsEmbeddingModelEnabledUseCase } from './application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.use-case';
import { AyunisOllamaStreamInferenceHandler } from './infrastructure/stream-inference/ayunis-ollama.stream-inference';
import { AyunisOllamaInferenceHandler } from './infrastructure/inference/ayunis-ollama.inference';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    LocalPermittedModelsRepositoryModule,
    LocalUserDefaultModelsRepositoryModule,
    LocalModelsRepositoryModule,
    LocalPermittedProvidersRepositoryModule,
    LegalAcceptancesModule,
    OrgsModule,
    UsersModule,
    SourcesModule,
    forwardRef(() => ThreadsModule), // Threads query models, deleting permitted model updates threads
    forwardRef(() => AgentsModule), // Agents query models, deleting permitted model updates agents
  ],
  controllers: [ModelsController, SuperAdminModelsController],
  providers: [
    ModelRegistry,
    ModelProviderInfoRegistry,
    ModelResponseDtoMapper,
    ModelWithConfigResponseDtoMapper,
    CatalogModelResponseDtoMapper,
    ModelProviderInfoResponseDtoMapper,
    PermittedProviderResponseDtoMapper,
    ModelProviderWithPermittedStatusResponseDtoMapper,
    MessageRequestDtoMapper,
    MistralInferenceHandler,
    OpenAIInferenceHandler,
    AnthropicInferenceHandler,
    LocalOllamaInferenceHandler,
    SynaforceInferenceHandler,
    AnthropicStreamInferenceHandler,
    OpenAIStreamInferenceHandler,
    MistralStreamInferenceHandler,
    LocalOllamaStreamInferenceHandler,
    SynaforceStreamInferenceHandler,
    LocalOllamaInferenceHandler,
    AyunisOllamaStreamInferenceHandler,
    AyunisOllamaInferenceHandler,
    MockStreamInferenceHandler,
    MockInferenceHandler,
    {
      provide: StreamInferenceHandlerRegistry,
      useFactory: (
        anthropicHandler: AnthropicStreamInferenceHandler,
        openaiHandler: OpenAIStreamInferenceHandler,
        mistralHandler: MistralStreamInferenceHandler,
        ollamaHandler: LocalOllamaStreamInferenceHandler,
        synaforceHandler: SynaforceStreamInferenceHandler,
        ayunisHandler: AyunisOllamaStreamInferenceHandler,
        mockHandler: MockStreamInferenceHandler,
        configService: ConfigService,
      ) => {
        const registry = new StreamInferenceHandlerRegistry(configService);
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OLLAMA, ollamaHandler);
        registry.register(ModelProvider.SYNAFORCE, synaforceHandler);
        registry.register(ModelProvider.AYUNIS, ayunisHandler);
        registry.registerMockHandler(mockHandler);
        return registry;
      },
      inject: [
        AnthropicStreamInferenceHandler,
        OpenAIStreamInferenceHandler,
        MistralStreamInferenceHandler,
        LocalOllamaStreamInferenceHandler,
        SynaforceStreamInferenceHandler,
        AyunisOllamaStreamInferenceHandler,
        MockStreamInferenceHandler,
        ConfigService,
      ],
    },
    {
      provide: InferenceHandlerRegistry,
      useFactory: (
        mistralHandler: MistralInferenceHandler,
        openaiHandler: OpenAIInferenceHandler,
        anthropicHandler: AnthropicInferenceHandler,
        ollamaHandler: LocalOllamaInferenceHandler,
        synaforceHandler: SynaforceInferenceHandler,
        ayunisHandler: AyunisOllamaInferenceHandler,
        mockHandler: MockInferenceHandler,
        configService: ConfigService,
      ) => {
        const registry = new InferenceHandlerRegistry(configService);
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        registry.register(ModelProvider.OLLAMA, ollamaHandler);
        registry.register(ModelProvider.SYNAFORCE, synaforceHandler);
        registry.register(ModelProvider.AYUNIS, ayunisHandler);
        registry.registerMockHandler(mockHandler);
        return registry;
      },
      inject: [
        MistralInferenceHandler,
        OpenAIInferenceHandler,
        AnthropicInferenceHandler,
        LocalOllamaInferenceHandler,
        SynaforceInferenceHandler,
        AyunisOllamaInferenceHandler,
        MockInferenceHandler,
        ConfigService,
      ],
    },
    // Use Cases
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetInferenceUseCase,
    StreamInferenceUseCase,
    GetAvailableModelsUseCase,
    GetModelProviderInfoUseCase,
    GetPermittedLanguageModelsUseCase,
    IsEmbeddingModelEnabledUseCase,
    // User Default Model Use Cases
    ManageUserDefaultModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    ManageOrgDefaultModelUseCase,
    // Model Management Use Cases
    CreateLanguageModelUseCase,
    CreateEmbeddingModelUseCase,
    UpdateLanguageModelUseCase,
    UpdateEmbeddingModelUseCase,
    GetModelUseCase,
    GetModelByIdUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
    // Permitted Provider Use Cases
    CreatePermittedProviderUseCase,
    DeletePermittedProviderUseCase,
    GetAllPermittedProvidersUseCase,
    GetAllModelProviderInfosWithPermittedStatusUseCase,
    IsProviderPermittedUseCase,
  ],
  exports: [
    InferenceHandlerRegistry,
    ModelRegistry,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedModelsUseCase,
    GetAllPermittedProvidersUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    // Use Cases
    GetInferenceUseCase,
    StreamInferenceUseCase,
    GetAvailableModelsUseCase,
    IsEmbeddingModelEnabledUseCase,
    // User Default Model Use Cases
    ManageUserDefaultModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    ManageOrgDefaultModelUseCase,
    // Model Management Use Cases
    CreateLanguageModelUseCase,
    CreateEmbeddingModelUseCase,
    UpdateLanguageModelUseCase,
    UpdateEmbeddingModelUseCase,
    GetModelUseCase,
    GetModelByIdUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
    // TODO: These modules should be part of this module and not separate
    LocalModelsRepositoryModule, // Export repository for seeding
    LocalPermittedModelsRepositoryModule, // Export repository for seeding
    LocalPermittedProvidersRepositoryModule, // Export repository for seeding
  ],
})
export class ModelsModule {}
