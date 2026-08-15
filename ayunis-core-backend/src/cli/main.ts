import 'src/config/env';
import { CommandFactory } from 'nest-commander';
import { Logger } from 'nestjs-pino';
import { CliModule } from 'src/cli/cli.module';

async function bootstrap() {
  const app = await CommandFactory.createWithoutRunning(CliModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.flushLogs();

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
