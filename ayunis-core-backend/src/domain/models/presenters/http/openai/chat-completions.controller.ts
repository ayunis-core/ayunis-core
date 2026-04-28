import { Body, Controller, Logger, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Subscription } from 'rxjs';
import { isUUID } from 'class-validator';
import type { UUID } from 'crypto';

import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';

import { GetInferenceUseCase } from '../../../application/use-cases/get-inference/get-inference.use-case';
import { StreamInferenceUseCase } from '../../../application/use-cases/stream-inference/stream-inference.use-case';
import { GetPermittedLanguageModelUseCase } from '../../../application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from '../../../application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { GetPermittedLanguageModelByNameUseCase } from '../../../application/use-cases/get-permitted-language-model-by-name/get-permitted-language-model-by-name.use-case';
import { GetPermittedLanguageModelByNameQuery } from '../../../application/use-cases/get-permitted-language-model-by-name/get-permitted-language-model-by-name.query';

import type { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { ChatCompletionRequestDto } from './dto/chat-completion-request.dto';
import { ChatCompletionResponseDto } from './dto/chat-completion-response.dto';
import { OpenAIChatCompletionsMappers } from './mappers/openai-mappers';

const HEARTBEAT_INTERVAL_MS = 15_000;

@ApiTags('openai-compat')
@ApiExcludeController()
@Controller('openai/v1/chat/completions')
@RequireSubscription()
export class ChatCompletionsController {
  private readonly logger = new Logger(ChatCompletionsController.name);

  constructor(
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly getPermittedLanguageModelByNameUseCase: GetPermittedLanguageModelByNameUseCase,
    private readonly mappers: OpenAIChatCompletionsMappers,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'OpenAI-compatible chat completions endpoint',
    description:
      'Accepts requests in OpenAI Chat Completions v1 format and routes them ' +
      'to the caller org’s permitted language model. Streaming via ' +
      'Server-Sent Events when `stream: true`.',
  })
  @ApiBody({ type: ChatCompletionRequestDto })
  @ApiResponse({ status: 200, type: ChatCompletionResponseDto })
  @ApiResponse({ status: 401, description: 'API key invalid or missing' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async create(
    @Body() dto: ChatCompletionRequestDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const orgId = this.mappers.context.requireOrgId();
      const model = await this.resolveModel(dto.model);
      if (dto.stream) {
        await this.handleStream(dto, model, orgId, request, response);
      } else {
        await this.handleNonStream(dto, model, response);
      }
    } catch (error) {
      this.sendError(response, error);
    }
  }

  private async resolveModel(modelId: string): Promise<PermittedLanguageModel> {
    if (isUUID(modelId)) {
      return this.getPermittedLanguageModelUseCase.execute(
        new GetPermittedLanguageModelQuery({ id: modelId as UUID }),
      );
    }
    return this.getPermittedLanguageModelByNameUseCase.execute(
      new GetPermittedLanguageModelByNameQuery({ name: modelId }),
    );
  }

  private async handleNonStream(
    dto: ChatCompletionRequestDto,
    model: PermittedLanguageModel,
    response: Response,
  ): Promise<void> {
    const command = this.mappers.request.toGetInferenceCommand(dto, model);
    const inferenceResponse = await this.getInferenceUseCase.execute(command);
    const responseDto = this.mappers.response.toResponseDto(
      inferenceResponse,
      dto.model,
    );
    response.status(200).json(responseDto);
  }

  private async handleStream(
    dto: ChatCompletionRequestDto,
    model: PermittedLanguageModel,
    orgId: UUID,
    request: Request,
    response: Response,
  ): Promise<void> {
    const input = this.mappers.request.toStreamInferenceInput(
      dto,
      model,
      orgId,
    );
    const stream$ = this.streamInferenceUseCase.execute(input);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.write(': connection established\n\n');

    const ctx = this.mappers.stream.createContext(dto.model);
    response.write(
      `data: ${JSON.stringify(this.mappers.stream.initialChunk(ctx))}\n\n`,
    );

    const subscriptionRef: { current?: Subscription } = {};
    let disconnected = false;
    let settled = false;

    await new Promise<void>((resolve) => {
      const settle = () => {
        if (settled) return;
        settled = true;
        clearInterval(heartbeat);
        request.off('close', onClose);
        subscriptionRef.current?.unsubscribe();
        if (!response.writableEnded) response.end();
        resolve();
      };

      const onClose = () => {
        disconnected = true;
        settle();
      };
      request.on('close', onClose);

      const heartbeat = setInterval(() => {
        if (!disconnected && !response.writableEnded) {
          response.write(': heartbeat\n\n');
        }
      }, HEARTBEAT_INTERVAL_MS);

      subscriptionRef.current = stream$.subscribe({
        next: (chunk) => {
          if (disconnected) return;
          const dtoChunk = this.mappers.stream.toChunkDto(chunk, ctx);
          if (dtoChunk) {
            response.write(`data: ${JSON.stringify(dtoChunk)}\n\n`);
          }
        },
        error: (err) => {
          this.logger.error('Streaming inference failed', err);
          if (!disconnected) {
            const envelope = this.mappers.error.toEnvelope(err).body;
            response.write(`data: ${JSON.stringify(envelope)}\n\n`);
            // Always emit [DONE] so OpenAI SDK clients close cleanly even
            // on the error path.
            response.write('data: [DONE]\n\n');
          }
          settle();
        },
        complete: () => {
          if (!disconnected) response.write('data: [DONE]\n\n');
          settle();
        },
      });
    });
  }

  private sendError(response: Response, error: unknown): void {
    if (response.headersSent) {
      this.logger.error(
        'Error after headers sent; cannot rewrite response',
        error,
      );
      response.end();
      return;
    }
    const { status, body } = this.mappers.error.toEnvelope(error);
    response.status(status).json(body);
  }
}
