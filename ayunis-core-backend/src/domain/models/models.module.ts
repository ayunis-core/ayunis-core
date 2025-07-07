import { forwardRef, Module } from '@nestjs/common';
import { ModelsController } from './presenters/http/models.controller';
import { MistralInferenceHandler } from './infrastructure/inference/mistral.inference';
import { InferenceHandlerRegistry } from './application/registry/inference-handler.registry';
import { ModelRegistry } from './application/registry/model.registry';
import {
  MISTRAL_INFERENCE_HANDLER,
  ANTHROPIC_INFERENCE_HANDLER,
  OPENAI_INFERENCE_HANDLER,
  OLLAMA_INFERENCE_HANDLER,
} from './application/tokens/inference-handler.tokens';
import { ModelProvider } from './domain/value-objects/model-provider.enum';
import { OpenAIInferenceHandler } from './infrastructure/inference/openai.inference';
import { AnthropicInferenceHandler } from './infrastructure/inference/anthropic.inference';
import { GetInferenceUseCase } from './application/use-cases/get-inference/get-inference.use-case';
import { GetAvailableModelsUseCase } from './application/use-cases/get-available-models/get-available-models.use-case';
import { GetDefaultModelUseCase } from './application/use-cases/get-default-model/get-default-model.use-case';
import { GetPermittedModelUseCase } from './application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { GetPermittedModelsUseCase } from './application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { IsModelPermittedUseCase } from './application/use-cases/is-model-permitted/is-model-permitted.use-case';
import { ModelResponseDtoMapper } from './presenters/http/mappers/model-response-dto.mapper';
import { ModelWithConfigResponseDtoMapper } from './presenters/http/mappers/model-with-config-response-dto.mapper';
import { LocalPermittedModelsRepositoryModule } from './infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { LocalUserDefaultModelsRepositoryModule } from './infrastructure/persistence/local-user-default-models/local-user-default-models-repository.module';
import { LocalModelsRepositoryModule } from './infrastructure/persistence/local-models/local-models-repository.module';
import { CreatePermittedModelUseCase } from './application/use-cases/create-permitted-model/create-permitted-model.use-case';
import { DeletePermittedModelUseCase } from './application/use-cases/delete-permitted-model/delete-permitted-model.use-case';
import { GetAvailableModelUseCase } from './application/use-cases/get-available-model/get-available-model.use-case';
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
import { CreateCustomToolUseCase } from '../tools/application/use-cases/create-custom-tool/create-custom-tool.use-case';
import { MistralStreamInferenceHandler } from './infrastructure/stream-inference/mistral.stream-inference';
import { CreateModelUseCase } from './application/use-cases/create-model/create-model.use-case';
import { UpdateModelUseCase } from './application/use-cases/update-model/update-model.use-case';
import { GetModelUseCase } from './application/use-cases/get-model/get-model.use-case';
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
import { OllamaStreamInferenceHandler } from './infrastructure/stream-inference/ollama.stream-inference';

@Module({
  imports: [
    LocalPermittedModelsRepositoryModule,
    LocalUserDefaultModelsRepositoryModule,
    LocalModelsRepositoryModule,
    LocalPermittedProvidersRepositoryModule,
    LegalAcceptancesModule,
    OrgsModule,
    forwardRef(() => ThreadsModule), // Threads query models, deleting permitted model updates threads
    forwardRef(() => AgentsModule), // Agents query models, deleting permitted model updates agents
  ],
  controllers: [ModelsController],
  providers: [
    ModelRegistry,
    ModelProviderInfoRegistry,
    ModelResponseDtoMapper,
    ModelWithConfigResponseDtoMapper,
    ModelProviderInfoResponseDtoMapper,
    PermittedProviderResponseDtoMapper,
    ModelProviderWithPermittedStatusResponseDtoMapper,
    MessageRequestDtoMapper,
    AnthropicStreamInferenceHandler,
    OpenAIStreamInferenceHandler,
    MistralStreamInferenceHandler,
    OllamaStreamInferenceHandler,
    {
      provide: MISTRAL_INFERENCE_HANDLER,
      useClass: MistralInferenceHandler,
    },
    {
      provide: OPENAI_INFERENCE_HANDLER,
      useClass: OpenAIInferenceHandler,
    },
    {
      provide: ANTHROPIC_INFERENCE_HANDLER,
      useClass: AnthropicInferenceHandler,
    },
    {
      provide: OLLAMA_INFERENCE_HANDLER,
      useClass: OllamaStreamInferenceHandler,
    },
    {
      provide: StreamInferenceHandlerRegistry,
      useFactory: (
        anthropicHandler: AnthropicStreamInferenceHandler,
        openaiHandler: OpenAIStreamInferenceHandler,
        mistralHandler: MistralStreamInferenceHandler,
        ollamaHandler: OllamaStreamInferenceHandler,
      ) => {
        const registry = new StreamInferenceHandlerRegistry();
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OLLAMA, ollamaHandler);
        return registry;
      },
      inject: [
        AnthropicStreamInferenceHandler,
        OpenAIStreamInferenceHandler,
        MistralStreamInferenceHandler,
        OllamaStreamInferenceHandler,
      ],
    },
    {
      provide: InferenceHandlerRegistry,
      useFactory: (
        mistralHandler: MistralInferenceHandler,
        openaiHandler: OpenAIInferenceHandler,
        anthropicHandler: AnthropicInferenceHandler,
      ) => {
        const registry = new InferenceHandlerRegistry();
        registry.register(ModelProvider.MISTRAL, mistralHandler);
        registry.register(ModelProvider.OPENAI, openaiHandler);
        registry.register(ModelProvider.ANTHROPIC, anthropicHandler);
        return registry;
      },
      inject: [
        MISTRAL_INFERENCE_HANDLER,
        OPENAI_INFERENCE_HANDLER,
        ANTHROPIC_INFERENCE_HANDLER,
      ],
    },
    // Use Cases
    CreateCustomToolUseCase,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    GetAvailableModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    GetInferenceUseCase,
    StreamInferenceUseCase,
    GetAvailableModelsUseCase,
    GetModelProviderInfoUseCase,
    // User Default Model Use Cases
    ManageUserDefaultModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    ManageOrgDefaultModelUseCase,
    // Model Management Use Cases
    CreateModelUseCase,
    UpdateModelUseCase,
    GetModelUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
    // Permitted Provider Use Cases
    CreatePermittedProviderUseCase,
    DeletePermittedProviderUseCase,
    GetAllPermittedProvidersUseCase,
    GetAllModelProviderInfosWithPermittedStatusUseCase,
  ],
  exports: [
    InferenceHandlerRegistry,
    ModelRegistry,
    CreatePermittedModelUseCase,
    DeletePermittedModelUseCase,
    GetAvailableModelUseCase,
    GetPermittedModelUseCase,
    GetPermittedModelsUseCase,
    IsModelPermittedUseCase,
    GetDefaultModelUseCase,
    // Use Cases
    GetInferenceUseCase,
    StreamInferenceUseCase,
    GetAvailableModelsUseCase,
    // User Default Model Use Cases
    ManageUserDefaultModelUseCase,
    DeleteUserDefaultModelUseCase,
    DeleteUserDefaultModelsByModelIdUseCase,
    GetUserDefaultModelUseCase,
    GetOrgDefaultModelUseCase,
    // Org Default Model Use Cases
    ManageOrgDefaultModelUseCase,
    // Model Management Use Cases
    CreateModelUseCase,
    UpdateModelUseCase,
    GetModelUseCase,
    GetAllModelsUseCase,
    DeleteModelUseCase,
  ],
})
export class ModelsModule {}
