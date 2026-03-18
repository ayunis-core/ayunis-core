import type { ConfigService } from '@nestjs/config';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

/**
 * Creates an AnthropicBedrock client from NestJS ConfigService.
 *
 * When both access key and secret key are present, static credentials are used.
 * Otherwise, the SDK falls back to the default AWS credential provider chain
 * (environment variables, EC2 instance role, ECS task role, etc.).
 */
export function createBedrockClient(
  configService: ConfigService,
): AnthropicBedrock {
  const awsRegion =
    configService.get<string>('models.bedrock.awsRegion') ?? 'us-east-1';
  const awsAccessKey = configService.get<string>(
    'models.bedrock.awsAccessKeyId',
  );
  const awsSecretKey = configService.get<string>(
    'models.bedrock.awsSecretAccessKey',
  );

  if (awsAccessKey && awsSecretKey) {
    return new AnthropicBedrock({ awsRegion, awsAccessKey, awsSecretKey });
  }

  return new AnthropicBedrock({ awsRegion });
}
