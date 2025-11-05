import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';
import { CollectUsageCommand } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.command';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

@Command({
  name: 'test:usage',
  description: 'Test usage collection functionality',
})
export class SeedUsageCommand extends CommandRunner {
  private readonly logger = new Logger(SeedUsageCommand.name);

  constructor(private readonly collectUsageUseCase: CollectUsageUseCase) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Testing usage collection...');

    try {
      // Use existing IDs from the database
      const userId = '789eb25d-23bf-431c-b770-da76bd6526f6' as UUID;
      const organizationId = '33436634-a83e-4555-a888-adf252888349' as UUID;
      const modelId = '1e9e3aa9-70a2-4885-878a-343c94aa7cec' as UUID; // claude-sonnet-4
      const requestId = crypto.randomUUID();

      const command = new CollectUsageCommand(
        userId,
        organizationId,
        modelId,
        ModelProvider.ANTHROPIC,
        requestId,
        150, // inputTokens
        250, // outputTokens
        400, // totalTokens
      );

      await this.collectUsageUseCase.execute(command);

      this.logger.log('Usage collection test completed successfully');
    } catch (error) {
      this.logger.error('Usage collection test failed', error);
      throw error;
    }
  }
}
