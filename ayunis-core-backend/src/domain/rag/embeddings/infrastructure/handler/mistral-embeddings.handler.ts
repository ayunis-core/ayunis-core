import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { Embedding } from '../../domain/embedding.entity';
import { Mistral } from '@mistralai/mistralai';
import { ConfigService } from '@nestjs/config';
import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { EmbeddingsProvider } from '../../domain/embeddings-provider.enum';
import { NoEmbeddingsReturnedError } from '../../application/embeddings.errors';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';

// Embeddings are small, fast requests (healthy p95 ~1.3s). The tight
// per-attempt timeout turns a stalled connection into a quick retry instead
// of an indefinite hang that also wedges a slot in the global embeddings
// queue (AYC-422).
const EMBEDDINGS_TIMEOUT_MS = 30_000;

@Injectable()
export class MistralEmbeddingsHandler extends EmbeddingsHandler {
  private readonly mistral: Mistral;

  constructor(
    @InjectPinoLogger(MistralEmbeddingsHandler.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    super();
    this.mistral = new Mistral({
      apiKey: this.configService.get('embeddings.mistral.apiKey'),
      timeoutMs: EMBEDDINGS_TIMEOUT_MS,
    });
  }

  isAvailable(): boolean {
    return !!this.configService.get('embeddings.mistral.apiKey');
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    this.logger.info({ model: model.name, inputCount: input.length }, 'embed');
    const embeddingsBatchResponse = await retryWithBackoff({
      fn: () =>
        this.mistral.embeddings.create({
          model: model.name,
          inputs: input,
        }),
      maxRetries: 3,
      delay: 2000,
      retryIfError: (error: Error) => {
        const isTransient = isTransientMistralError(error);
        if (isTransient) {
          this.logger.warn(
            { err: error },
            'Retrying Mistral embeddings after transient error',
          );
        }
        return isTransient;
      },
    });

    return embeddingsBatchResponse.data.map((data) => {
      if (!data.embedding) {
        this.logger.error(
          { model: model.name },
          'No embedding returned from Mistral',
        );
        throw new NoEmbeddingsReturnedError(EmbeddingsProvider.MISTRAL, {
          data,
        });
      }
      if (data.index === undefined) {
        this.logger.error(
          { model: model.name },
          'No index returned from Mistral',
        );
        throw new NoEmbeddingsReturnedError(EmbeddingsProvider.MISTRAL, {
          data,
        });
      }
      return new Embedding(data.embedding, input[data.index], model);
    });
  }
}
