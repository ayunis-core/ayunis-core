import 'src/config/env';
import { CommandFactory } from 'nest-commander';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { CliModule } from 'src/cli/cli.module';

async function bootstrap() {
  const app = await CommandFactory.createWithoutRunning(CliModule, {
    bufferLogs: true,
  });
  installNestLogger(app);

  try {
    await CommandFactory.runApplication(app);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
