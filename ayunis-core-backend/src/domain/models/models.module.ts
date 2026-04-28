import { forwardRef, Module } from '@nestjs/common';
import { ModelsController } from './presenters/http/models.controller';
import { ModelsDefaultsController } from './presenters/http/models-defaults.controller';
import { SuperAdminPermittedModelsController } from './presenters/http/super-admin-permitted-models.controller';
import { SuperAdminCatalogModelsController } from './presenters/http/super-admin-catalog-models.controller';
import { SuperAdminLanguageCatalogModelsController } from './presenters/http/super-admin-language-catalog-models.controller';
import { SuperAdminEmbeddingCatalogModelsController } from './presenters/http/super-admin-embedding-catalog-models.controller';
import { SuperAdminImageGenerationCatalogModelsController } from './presenters/http/super-admin-image-generation-catalog-models.controller';
import { MistralInferenceHandler } from './infrastructure/inference/mistral.inference';
import { InferenceHandlerRegistry } from './application/registry/inference-handler.registry';
import { ModelProvider } from './domain/value-objects/model-provider.enum';
import { OpenAIInferenceHandler } from './infrastructure/inference/openai.inference';
import { AnthropicInferenceHandler } from './infrastructure/inference/anthropic.inference';
import { MockInferenceHandler } from './infrastructure/inference/mock.inference';
import { MockStreamInferenceHandler } from './infrastructure/stream-inference/mock.stream-inference';
import { GetInferenceUseCase } from './application/use-cases/get-inference/get-inference.use-case';
import { GetConfiguredModelsByTypeUseCase } from './application/use-cases/get-configured-models-by-type/get-configured-models-by-type.use-case';
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
import { UpdatePermittedModelUseCase } from './application/use-cases/update-permitted-model/update-permitted-model.use-case';
import { StreamInferenceUseCase } from './application/use-cases/stream-inference/stream-inference.use-case';
import { StreamInferenceHandlerRegistry } from './application/registry/stream-inference-handler.registry';
import { AnthropicStreamInferenceHandler } from './infrastructure/stream-inference/anthropic.stream-inference';
import { OpenAIStreamInferenceHandler } from './infrastructure/stream-inference/openai.stream-inference';
import { SetUserDefaultLanguageModelUseCase } from './application/use-cases/set-user-default-language-model/set-user-default-language-model.use-case';
import { DeleteUserDefaultModelUseCase } from './application/use-cases/delete-user-default-model/delete-user-default-model.use-case';
import { GetUserDefaultModelUseCase } from './application/use-cases/get-user-default-model/get-user-default-model.use-case';
import { GetOrgDefaultModelUseCase } from './application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { SetOrgDefaultLanguageModelUseCase } from './application/use-cases/set-org-default-language-model/set-org-default-language-model.use-case';
import { MessageRequestDtoMapper } from './presenters/http/mappers/message-request-dto.mapper';
import { MistralStreamInferenceHandler } from './infrastructure/stream-inference/mistral.stream-inference';
import { CreateLanguageModelUseCase } from './application/use-cases/create-language-model/create-language-model.use-case';
import { CreateEmbeddingModelUseCase } from './application/use-cases/create-embedding-model/create-embedding-model.use-case';
import { UpdateLanguageModelUseCase } from './application/use-cases/update-language-model/update-language-model.use-case';
import { UpdateEmbeddingModelUseCase } from './application/use-cases/update-embedding-model/update-embedding-model.use-case';
import { CreateImageGenerationModelUseCase } from './application/use-cases/create-image-generation-model/create-image-generation-model.use-case';
import { UpdateImageGenerationModelUseCase } from './application/use-cases/update-image-generation-model/update-image-generation-model.use-case';
import { GetModelUseCase } from './application/use-cases/get-model/get-model.use-case';
import { GetModelByIdUseCase } from './application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { GetAllModelsUseCase } from './application/use-cases/get-all-models/get-all-models.use-case';
import { DeleteModelUseCase } from './application/use-cases/delete-model/delete-model.use-case';

import { ModelProviderInfoRegistry } from './application/registry/model-provider-info.registry';
import { GetModelProviderInfoUseCase } from './application/use-cases/get-model-provider-info/get-model-provider-info.use-case';
import { ModelProviderInfoResponseDtoMapper } from './presenters/http/mappers/model-provider-info-response-dto.mapper';
import { ThreadsModule } from '../threads/threads.module';
import { AgentsModule } from '../agents/agents.module';
import { DeleteUserDefaultModelsByModelIdUseCase } from './application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { ClearDefaultsByCatalogModelIdUseCase } from './application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { LocalOllamaInferenceHandler } from './infrastructure/inference/local-ollama.inference';
import { LocalOllamaStreamInferenceHandler } from './infrastructure/stream-inference/local-ollama.stream-inference';
import { SynaforceInferenceHandler } from './infrastructure/inference/synaforce.inference';
import { SynaforceStreamInferenceHandler } from './infrastructure/stream-inference/synaforce.stream-inference';
import { GetPermittedLanguageModelsUseCase } from './application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelUseCase } from './application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelByNameUseCase } from './application/use-cases/get-permitted-language-model-by-name/get-permitted-language-model-by-name.use-case';
import { GetPermittedEmbeddingModelUseCase } from './application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedImageGenerationModelUseCase } from './application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { UsersModule } from 'src/iam/users/users.module';
import { SourcesModule } from '../sources/sources.module';
import { IsEmbeddingModelEnabledUseCase } from './application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.use-case';
import { AyunisOllamaStreamInferenceHandler } from './infrastructure/stream-inference/ayunis-ollama.stream-inference';
import { AyunisOllamaInferenceHandler } from './infrastructure/inference/ayunis-ollama.inference';
import { OtcInferenceHandler } from './infrastructure/inference/otc.inference';
import { OtcStreamInferenceHandler } from './infrastructure/stream-inference/otc.stream-inference';
import { BedrockInferenceHandler } from './infrastructure/inference/bedrock.inference';
import { BedrockStreamInferenceHandler } from './infrastructure/stream-inference/bedrock.stream-inference';
import { AzureInferenceHandler } from './infrastructure/inference/azure.inference';
import { AzureStreamInferenceHandler } from './infrastructure/stream-inference/azure.stream-inference';
import { GeminiInferenceHandler } from './infrastructure/inference/gemini.inference';
import { GeminiStreamInferenceHandler } from './infrastructure/stream-inference/gemini.stream-inference';
import { StackitInferenceHandler } from './infrastructure/inference/stackit.inference';
import { StackitStreamInferenceHandler } from './infrastructure/stream-inference/stackit.stream-inference';
import { ScalewayInferenceHandler } from './infrastructure/inference/scaleway.inference';
import { ScalewayStreamInferenceHandler } from './infrastructure/stream-inference/scaleway.stream-inference';
import { ConfigService } from '@nestjs/config';
import { ImageGenerationHandlerRegistry } from './application/registry/image-generation-handler.registry';
import { AzureImageGenerationHandler } from './infrastructure/image-generation/azure.image-generation';
import { MockImageGenerationHandler } from './infrastructure/image-generation/mock.image-generation';
import { GenerateImageUseCase } from './application/use-cases/generate-image/generate-image.use-case';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { GetEffectiveLanguageModelsUseCase } from './application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { CreateTeamPermittedModelUseCase } from './application/use-cases/create-team-permitted-model/create-team-permitted-model.use-case';
import { DeleteTeamPermittedModelUseCase } from './application/use-cases/delete-team-permitted-model/delete-team-permitted-model.use-case';
import { GetTeamPermittedModelsUseCase } from './application/use-cases/get-team-permitted-models/get-team-permitted-models.use-case';
import { SetTeamDefaultModelUseCase } from './application/use-cases/set-team-default-model/set-team-default-model.use-case';
import { TeamPermittedModelsController } from './presenters/http/team-permitted-models.controller';
import { TeamPermittedModelValidator } from './application/services/team-permitted-model-validator.service';
import { ModelPolicyService } from './application/services/model-policy.service';
import { StorageModule } from '../storage/storage.module';
import { MessagesModule } from '../messages/messages.module';
import { OpenAIResponsesMessageConverter } from './infrastructure/converters/openai-responses-message.converter';
import { GeminiMessageConverter } from './infrastructure/converters/gemini-message.converter';
import { MistralMessageConverter } from './infrastructure/converters/mistral-message.converter';

@Module({
  imports: [
    LocalPermittedModelsRepositoryModule,
    LocalUserDefaultModelsRepositoryModule,
    LocalModelsRepositoryModule,
    OrgsModule,
    UsersModule,
    TeamsModule,
    StorageModule,
    forwardRef(() => MessagesModule), // ImageContentService for inference handlers
    forwardRef(() => SourcesModule), // Sources → Retrievers → FileRetrievers → Models (circular)
    forwardRef(() => ThreadsModule), // Threads query models, deleting permitted model updates threads
    forwardRef(() => AgentsModule), // Agents query models, deleting permitted model updates agents
  ],
  controllers: [
    ModelsController,
    ModelsDefaultsController,
    TeamPermittedModelsController,
    SuperAdminPermittedModelsController,
    SuperAdminCatalogModelsController,
    SuperAdminLanguageCatalogModelsController,
    SuperAdminEmbeddingCatalogModelsController,
    SuperAdminImageGenerationCatalogModelsController,
  ],
  providers: [
    ModelProviderInfoRegistry,
    OpenAIResponsesMessageConverter,
    GeminiMessageConverter,
    MistralMessageConverter,
    ModelResponseDtoMapper,
    ModelWithConfigResponseDtoMapper,
    CatalogModelResponseDtoMapper,
    ModelProviderInfoResponseDtoMapper,
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
    OtcStreamInferenceHandler,
    OtcInferenceHandler,
    BedrockInferenceHandler,
    BedrockStreamInferenceHandler,
    AzureInferenceHandler,
    AzureStreamInferenceHandler,
    GeminiInferenceHandler,
    GeminiStreamInferenceHandler,
    StackitInferenceHandler,
    StackitStreamInferenceHandler,
    ScalewayInferenceHandler,
    ScalewayStreamInferenceHandler,
    MockStreamInferenceHandler,
    MockInferenceHandler,
    AzureImageGenerationHandler,
    MockImageGenerationHandler,
    {
      provide: StreamInferenceHandlerRegistry,
      useFactory: (
        anthropicHandler: AnthropicStreamInferenceHandler,
        openaiHandler: OpenAIStreamInferenceHandler,
        mistralHandler: MistralStreamInferenceHandler,
        ollamaHandler: LocalOllamaStreamInferenceHandler,
        synaforceHandler: SynaforceStreamInferenceHandler,
        ayunisHandler: AyunisOllamaStreamInferenceHandler,
        otcHandler: OtcStreamInferenceHandler,
        bedrockHandler: BedrockStreamInferenceHandler,
        azureHandler: AzureStreamInferenceHandler,
        geminiHandler: GeminiStreamInferenceHandler,
        stackitHandler: StackitStreamInferenceHandler,
        scalewayHandler: ScalewayStreamInferenceHandler,
        mockHandler: MockStreamInferenceHandler,
        configService: ConfigService,
      ) => {
        const registry = new StreamInferenceHandlerRegistry(configService);
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        registry.register(ModelProvider.BEDROCK, bedrockHandler);
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OLLAMA, ollamaHandler);
        registry.register(ModelProvider.SYNAFORCE, synaforceHandler);
        registry.register(ModelProvider.AYUNIS, ayunisHandler);
        registry.register(ModelProvider.OTC, otcHandler);
        registry.register(ModelProvider.AZURE, azureHandler);
        registry.register(ModelProvider.GEMINI, geminiHandler);
        registry.register(ModelProvider.STACKIT, stackitHandler);
        registry.register(ModelProvider.SCALEWAY, scalewayHandler);
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
        OtcStreamInferenceHandler,
        BedrockStreamInferenceHandler,
        AzureStreamInferenceHandler,
        GeminiStreamInferenceHandler,
        StackitStreamInferenceHandler,
        ScalewayStreamInferenceHandler,
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
        bedrockHandler: BedrockInferenceHandler,
        ollamaHandler: LocalOllamaInferenceHandler,
        synaforceHandler: SynaforceInferenceHandler,
        ayunisHandler: AyunisOllamaInferenceHandler,
        otcHandler: OtcInferenceHandler,
        azureHandler: AzureInferenceHandler,
        geminiHandler: GeminiInferenceHandler,
        stackitHandler: StackitInferenceHandler,
        scalewayHandler: ScalewayInferenceHandler,
        mockHandler: MockInferenceHandler,
        configService: ConfigService,
      ) => {
        const registry = new InferenceHandlerRegistry(configService);
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        registry.register(ModelProvider.BEDROCK, bedrockHandler);
        registry.register(ModelProvider.OLLAMA, ollamaHandler);
        registry.register(ModelProvider.SYNAFORCE, synaforceHandler);
        registry.register(ModelProvider.AYUNIS, ayunisHandler);
        registry.register(ModelProvider.OTC, otcHandler);
        registry.register(ModelProvider.AZURE, azureHandler);
        registry.register(ModelProvider.GEMINI, geminiHandler);
        registry.register(ModelProvider.STACKIT, stackitHandler);
        registry.register(ModelProvider.SCALEWAY, scalewayHandler);
        registry.registerMockHandler(mockHandler);
        return registry;
      },
      inject: [
        MistralInferenceHandler,
        OpenAIInferenceHandler,
        AnthropicInferenceHandler,
        BedrockInferenceHandler,
        LocalOllamaInferenceHandler,
        SynaforceInferenceHandler,
        AyunisOllamaInferenceHandler,
        OtcInferenceHandler,
        AzureInferenceHandler,
        GeminiInferenceHandler,
        StackitInferenceHandler,
        ScalewayInferenceHandler,
        MockInferenceHandler,
        ConfigService,
      ],
    },
    {
      provide: ImageGenerationHandlerRegistry,
      useFactory: (
        azureHandler: AzureImageGenerationHandler,
        mockHandler: MockImageGenerationHandler,
        configService: ConfigService,
      ) => {
        const registry = new ImageGenerationHandlerRegistry(configService);
        registry.register(ModelProvider.AZURE, azureHandler);
        registry.registerMockHandler(mockHandler);
        return registry;
      },
      inject: [
        AzureImageGenerationHandler,
        MockImageGenerationHandler,
        ConfigService,
      ],
    },
    // Services
    ModelPolicyService,
    TeamPermittedModelValidator,
    // Use Cases
    GetEffectiveLanguageModelsUseCase,
    GetTeamPermittedModelsUseCase,
    CreateTeamPermittedModelUseCase,
    DeleteTeamPermittedModelUseCase,
    SetTeamDefaultModelUseCase,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    UpdatePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedLanguageModelByNameUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedImageGenerationModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetInferenceUseCase,
    GenerateImageUseCase,
    StreamInferenceUseCase,
    GetConfiguredModelsByTypeUseCase,
    GetModelProviderInfoUseCase,
    GetPermittedLanguageModelsUseCase,
    IsEmbeddingModelEnabledUseCase,
    // User Default Model Use Cases
    SetUserDefaultLanguageModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    SetOrgDefaultLanguageModelUseCase,
    // Catalog Model Archival Use Cases
    ClearDefaultsByCatalogModelIdUseCase,
    // Model Management Use Cases
    CreateLanguageModelUseCase,
    CreateEmbeddingModelUseCase,
    CreateImageGenerationModelUseCase,
    UpdateLanguageModelUseCase,
    UpdateEmbeddingModelUseCase,
    UpdateImageGenerationModelUseCase,
    GetModelUseCase,
    GetModelByIdUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
  ],
  exports: [
    InferenceHandlerRegistry,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    UpdatePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedLanguageModelByNameUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedImageGenerationModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetEffectiveLanguageModelsUseCase,
    // Use Cases
    GetInferenceUseCase,
    GenerateImageUseCase,
    StreamInferenceUseCase,
    GetConfiguredModelsByTypeUseCase,
    IsEmbeddingModelEnabledUseCase,
    // User Default Model Use Cases
    SetUserDefaultLanguageModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    SetOrgDefaultLanguageModelUseCase,
    // Model Management Use Cases
    CreateLanguageModelUseCase,
    CreateEmbeddingModelUseCase,
    CreateImageGenerationModelUseCase,
    UpdateLanguageModelUseCase,
    UpdateEmbeddingModelUseCase,
    UpdateImageGenerationModelUseCase,
    GetModelUseCase,
    GetModelByIdUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
    // eslint-disable-next-line sonarjs/todo-tag -- pre-existing architectural note
    // TODO: These modules should be part of this module and not separate
    LocalModelsRepositoryModule, // Export repository for seeding
    LocalPermittedModelsRepositoryModule, // Export repository for seeding
    LocalUserDefaultModelsRepositoryModule, // Export for AgentsModule (marketplace install)
  ],
})
export class ModelsModule {}
