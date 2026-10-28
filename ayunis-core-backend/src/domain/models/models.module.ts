import { forwardRef, Module } from '@nestjs/common';
import { ModelsController } from './presenters/http/models.controller';
import { ModelsDefaultsController } from './presenters/http/models-defaults.controller';
import { SuperAdminPermittedModelsController } from './presenters/http/super-admin-permitted-models.controller';
import { SuperAdminCatalogModelsController } from './presenters/http/super-admin-catalog-models.controller';
import { SuperAdminLanguageCatalogModelsController } from './presenters/http/super-admin-language-catalog-models.controller';
import { SuperAdminEmbeddingCatalogModelsController } from './presenters/http/super-admin-embedding-catalog-models.controller';
import { SuperAdminImageGenerationCatalogModelsController } from './presenters/http/super-admin-image-generation-catalog-models.controller';
import { ModelProvider } from './domain/value-objects/model-provider.enum';
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
import { ResolveModelProviderUseCase } from './application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import { MapMessagesToInferenceUseCase } from './application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { SetUserDefaultLanguageModelUseCase } from './application/use-cases/set-user-default-language-model/set-user-default-language-model.use-case';
import { DeleteUserDefaultModelUseCase } from './application/use-cases/delete-user-default-model/delete-user-default-model.use-case';
import { GetUserDefaultModelUseCase } from './application/use-cases/get-user-default-model/get-user-default-model.use-case';
import { GetOrgDefaultModelUseCase } from './application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { SetOrgDefaultLanguageModelUseCase } from './application/use-cases/set-org-default-language-model/set-org-default-language-model.use-case';
import { MessageRequestDtoMapper } from './presenters/http/mappers/message-request-dto.mapper';
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
import { AnthropicInferenceProviderFactory } from './infrastructure/inference-providers/anthropic.inference-provider';
import { AyunisOllamaInferenceProviderFactory } from './infrastructure/inference-providers/ayunis-ollama.inference-provider';
import { AzureInferenceProviderFactory } from './infrastructure/inference-providers/azure.inference-provider';
import { BedrockInferenceProviderFactory } from './infrastructure/inference-providers/bedrock.inference-provider';
import { GeminiInferenceProviderFactory } from './infrastructure/inference-providers/gemini.inference-provider';
import { LocalOllamaInferenceProviderFactory } from './infrastructure/inference-providers/local-ollama.inference-provider';
import { MistralInferenceProviderFactory } from './infrastructure/inference-providers/mistral.inference-provider';
import { OpenAIInferenceProviderFactory } from './infrastructure/inference-providers/openai.inference-provider';
import { OtcInferenceProviderFactory } from './infrastructure/inference-providers/otc.inference-provider';
import { ScalewayInferenceProviderFactory } from './infrastructure/inference-providers/scaleway.inference-provider';
import { StackitInferenceProviderFactory } from './infrastructure/inference-providers/stackit.inference-provider';
import { SynaforceInferenceProviderFactory } from './infrastructure/inference-providers/synaforce.inference-provider';
import { MockInferenceProviderFactory } from './infrastructure/inference-providers/mock.inference-provider';
import { InferenceProviderRegistry } from './application/registry/inference-provider.registry';
import { InferenceCallService } from './application/services/inference-call.service';
import { GetModelProviderInfoUseCase } from './application/use-cases/get-model-provider-info/get-model-provider-info.use-case';
import { ModelProviderInfoResponseDtoMapper } from './presenters/http/mappers/model-provider-info-response-dto.mapper';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { DeleteUserDefaultModelsByModelIdUseCase } from './application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { ClearDefaultsByCatalogModelIdUseCase } from './application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { GetPermittedLanguageModelsUseCase } from './application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelUseCase } from './application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedEmbeddingModelUseCase } from './application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedImageGenerationModelUseCase } from './application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { UsersModule } from 'src/iam/users/users.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { IsEmbeddingModelEnabledUseCase } from './application/use-cases/is-embedding-model-enabled/is-embedding-model-enabled.use-case';
import { ConfigService } from '@nestjs/config';
import { ImageGenerationHandlerRegistry } from './application/registry/image-generation-handler.registry';
import { AzureImageGenerationHandler } from './infrastructure/image-generation/azure.image-generation';
import { MockImageGenerationHandler } from './infrastructure/image-generation/mock.image-generation';
import { GenerateImageUseCase } from './application/use-cases/generate-image/generate-image.use-case';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { GetEffectiveLanguageModelsUseCase } from './application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { CreateTeamPermittedModelUseCase } from './application/use-cases/create-team-permitted-model/create-team-permitted-model.use-case';
import { DeleteTeamPermittedModelUseCase } from './application/use-cases/delete-team-permitted-model/delete-team-permitted-model.use-case';
import { UpdateTeamPermittedModelUseCase } from './application/use-cases/update-team-permitted-model/update-team-permitted-model.use-case';
import { GetTeamPermittedModelsUseCase } from './application/use-cases/get-team-permitted-models/get-team-permitted-models.use-case';
import { GetTeamPermittedImageGenerationModelsUseCase } from './application/use-cases/get-team-permitted-image-generation-models/get-team-permitted-image-generation-models.use-case';
import { SetTeamDefaultModelUseCase } from './application/use-cases/set-team-default-model/set-team-default-model.use-case';
import { TeamPermittedModelsController } from './presenters/http/team-permitted-models.controller';
import { TeamPermittedModelValidator } from './application/services/team-permitted-model-validator.service';
import { ModelPolicyService } from './application/services/model-policy.service';
import { ModelConfigurationService } from './application/services/model-configuration.service';
import { EffectiveModelScopeResolverService } from './application/services/effective-model-scope-resolver.service';
import { StorageModule } from 'src/domain/storage/storage.module';
import { MessagesModule } from 'src/domain/messages/messages.module';
import { UsageReferencesModule } from 'src/domain/usage/usage-references.module';

@Module({
  imports: [
    LocalPermittedModelsRepositoryModule,
    LocalUserDefaultModelsRepositoryModule,
    LocalModelsRepositoryModule,
    UsageReferencesModule,
    OrgsModule,
    UsersModule,
    TeamsModule,
    StorageModule,
    forwardRef(() => MessagesModule), // ImageContentService for inference calls
    forwardRef(() => SourcesModule), // Sources → Retrievers → FileRetrievers → Models (circular)
    forwardRef(() => ThreadsModule), // Threads query models, deleting permitted model updates threads
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
    ModelResponseDtoMapper,
    ModelWithConfigResponseDtoMapper,
    CatalogModelResponseDtoMapper,
    ModelProviderInfoResponseDtoMapper,
    MessageRequestDtoMapper,
    AnthropicInferenceProviderFactory,
    AyunisOllamaInferenceProviderFactory,
    AzureInferenceProviderFactory,
    BedrockInferenceProviderFactory,
    GeminiInferenceProviderFactory,
    LocalOllamaInferenceProviderFactory,
    MistralInferenceProviderFactory,
    OpenAIInferenceProviderFactory,
    OtcInferenceProviderFactory,
    ScalewayInferenceProviderFactory,
    StackitInferenceProviderFactory,
    SynaforceInferenceProviderFactory,
    MockInferenceProviderFactory,
    {
      provide: InferenceProviderRegistry,
      useFactory: (
        anthropicFactory: AnthropicInferenceProviderFactory,
        ayunisOllamaFactory: AyunisOllamaInferenceProviderFactory,
        azureFactory: AzureInferenceProviderFactory,
        bedrockFactory: BedrockInferenceProviderFactory,
        geminiFactory: GeminiInferenceProviderFactory,
        localOllamaFactory: LocalOllamaInferenceProviderFactory,
        mistralFactory: MistralInferenceProviderFactory,
        openAIFactory: OpenAIInferenceProviderFactory,
        otcFactory: OtcInferenceProviderFactory,
        scalewayFactory: ScalewayInferenceProviderFactory,
        stackitFactory: StackitInferenceProviderFactory,
        synaforceFactory: SynaforceInferenceProviderFactory,
        mockFactory: MockInferenceProviderFactory,
        configService: ConfigService,
      ) => {
        const registry = new InferenceProviderRegistry(configService);
        registry.register(ModelProvider.ANTHROPIC, anthropicFactory);
        registry.register(ModelProvider.OPENAI, openAIFactory);
        registry.register(ModelProvider.MISTRAL, mistralFactory);
        registry.register(ModelProvider.OLLAMA, localOllamaFactory);
        registry.register(ModelProvider.SYNAFORCE, synaforceFactory);
        registry.register(ModelProvider.AYUNIS, ayunisOllamaFactory);
        registry.register(ModelProvider.OTC, otcFactory);
        registry.register(ModelProvider.BEDROCK, bedrockFactory);
        registry.register(ModelProvider.AZURE, azureFactory);
        registry.register(ModelProvider.GEMINI, geminiFactory);
        registry.register(ModelProvider.STACKIT, stackitFactory);
        registry.register(ModelProvider.SCALEWAY, scalewayFactory);
        registry.registerMockFactory(mockFactory);
        return registry;
      },
      inject: [
        AnthropicInferenceProviderFactory,
        AyunisOllamaInferenceProviderFactory,
        AzureInferenceProviderFactory,
        BedrockInferenceProviderFactory,
        GeminiInferenceProviderFactory,
        LocalOllamaInferenceProviderFactory,
        MistralInferenceProviderFactory,
        OpenAIInferenceProviderFactory,
        OtcInferenceProviderFactory,
        ScalewayInferenceProviderFactory,
        StackitInferenceProviderFactory,
        SynaforceInferenceProviderFactory,
        MockInferenceProviderFactory,
        ConfigService,
      ],
    },
    InferenceCallService,
    AzureImageGenerationHandler,
    MockImageGenerationHandler,
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
    ModelConfigurationService,
    EffectiveModelScopeResolverService,
    TeamPermittedModelValidator,
    // Use Cases
    GetEffectiveLanguageModelsUseCase,
    GetTeamPermittedModelsUseCase,
    GetTeamPermittedImageGenerationModelsUseCase,
    CreateTeamPermittedModelUseCase,
    DeleteTeamPermittedModelUseCase,
    UpdateTeamPermittedModelUseCase,
    SetTeamDefaultModelUseCase,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    UpdatePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedImageGenerationModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetInferenceUseCase,
    GenerateImageUseCase,
    StreamInferenceUseCase,
    ResolveModelProviderUseCase,
    MapMessagesToInferenceUseCase,
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
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    UpdatePermittedModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedLanguageModelUseCase,
    GetPermittedLanguageModelsUseCase,
    GetPermittedEmbeddingModelUseCase,
    GetPermittedImageGenerationModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetEffectiveLanguageModelsUseCase,
    EffectiveModelScopeResolverService,
    // Use Cases
    GetInferenceUseCase,
    GenerateImageUseCase,
    StreamInferenceUseCase,
    ResolveModelProviderUseCase,
    MapMessagesToInferenceUseCase,
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
    LocalUserDefaultModelsRepositoryModule, // Export repository for seeding
  ],
})
export class ModelsModule {}
