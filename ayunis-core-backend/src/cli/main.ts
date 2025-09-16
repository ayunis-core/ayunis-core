import 'dotenv/config';
import { CommandFactory } from 'nest-commander';
import { CliModule } from 'src/cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['log', 'error', 'warn'],
  });
}

bootstrap();
