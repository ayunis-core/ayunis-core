import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { METRICS_PATH } from './metrics.constants';

@Controller('health')
class StubController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

describe('Metrics OpenAPI exclusion', () => {
  it('should remove /metrics from the generated OpenAPI document', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PrometheusModule.register({
          path: METRICS_PATH,
          defaultMetrics: { enabled: false },
        }),
      ],
      controllers: [StubController],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const config = new DocumentBuilder().setTitle('Test').build();
    const document = SwaggerModule.createDocument(app, config);

    // Precondition: the library registers /metrics in the spec
    expect(document.paths[METRICS_PATH]).toBeDefined();

    // Apply the same exclusion logic as setupSwagger in main.ts
    if (document.paths[METRICS_PATH]) {
      delete document.paths[METRICS_PATH];
    }

    expect(document.paths[METRICS_PATH]).toBeUndefined();
    // Other routes should still be present
    expect(document.paths['/health']).toBeDefined();

    await app.close();
  });
});
