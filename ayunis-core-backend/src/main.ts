// Utils
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { logger } from './common/logger/logger';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import { AppModule } from './app/app.module';
import { ApplicationErrorFilter } from './common/filters/application-error.filter';

class Bootstrap {
  private static readonly PORT = process.env.PORT ?? 3000;

  public static async start() {
    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger({ instance: logger }),
    });

    this.configureApp(app);
    await app.listen(this.PORT);

    Logger.log(`🚀 Application is running on http://localhost:${this.PORT}`);
  }

  private static configureApp(
    app: Awaited<ReturnType<typeof NestFactory.create>>,
  ) {
    this.configureCors(app);
    this.setupSwagger(app);
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new ApplicationErrorFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.enableShutdownHooks();
  }

  private static configureCors(
    app: Awaited<ReturnType<typeof NestFactory.create>>,
  ) {
    const configService = app.get(ConfigService);
    const isProduction =
      configService.get<string>('NODE_ENV', 'development') === 'production';

    const corsOptions: CorsOptions = {
      origin: this.determineAllowedOrigins(configService, isProduction),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization, cache-control',
      exposedHeaders: ['Set-Cookie'],
    };

    app.enableCors(corsOptions);
    Logger.log(
      `CORS configured for ${isProduction ? 'production' : 'development'} mode`,
    );
  }

  private static determineAllowedOrigins(
    configService: ConfigService,
    isProduction: boolean,
  ): string[] | boolean {
    if (!isProduction) {
      return true;
    }

    const corsOrigins = configService.get<string>(
      'web.cors.allowedOrigins',
      '',
    );
    if (!corsOrigins) {
      Logger.error(
        'CORS_ALLOWED_ORIGINS must be set in production environment.',
      );
      throw new Error('Missing CORS_ALLOWED_ORIGINS in production.');
    }

    return corsOrigins.split(',').map((origin) => origin.trim());
  }

  private static setupSwagger(
    app: Awaited<ReturnType<typeof NestFactory.create>>,
  ) {
    const config = new DocumentBuilder()
      .setTitle('Ayunis Core API')
      .setDescription('The Ayunis Core API description')
      .setVersion('1.0')
      .addTag('ayunis')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}

Bootstrap.start().catch((err) => {
  console.error('🚨 Failed to start application:', err);
  process.exit(1); // Exit with error
});
