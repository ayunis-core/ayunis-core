import { Injectable } from '@nestjs/common';
import {
  ImageGenerationHandler,
  ImageGenerationInput,
  ImageGenerationResult,
} from '../../application/ports/image-generation.handler';

/**
 * Mock image generation handler for testing environments.
 *
 * Returns a minimal 1x1 transparent PNG so tests can exercise the full
 * image-generation pipeline without making external API calls.
 *
 * @see ImageGenerationHandlerRegistry.getHandler() - Routing logic
 * @see MockInferenceHandler - Conversational equivalent
 */
@Injectable()
export class MockImageGenerationHandler extends ImageGenerationHandler {
  /** Minimal valid 1x1 transparent PNG (67 bytes). */
  private static readonly TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
      'Nl7BcQAAAABJRU5ErkJggg==',
    'base64',
  );

  generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    return Promise.resolve(
      new ImageGenerationResult(
        MockImageGenerationHandler.TRANSPARENT_PNG,
        'image/png',
        `mock-revised: ${input.prompt}`,
      ),
    );
  }
}
