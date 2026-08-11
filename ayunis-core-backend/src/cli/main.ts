import 'src/config/env';
import { CommandFactory } from 'nest-commander';
import { CliModule } from 'src/cli/cli.module';
import { handleCliError } from 'src/cli/cli-error-handler';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn'],
    serviceErrorHandler: handleCliError,
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
