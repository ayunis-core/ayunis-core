import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { EmbeddingsProvider } from '../src/domain/embeddings/domain/embeddings-provider.enum';

describe('Embeddings API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /embeddings/providers', () => {
    it('should return available embeddings providers', () => {
      return request(app.getHttpServer())
        .get('/embeddings/providers')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('providers');
          expect(Array.isArray(res.body.providers)).toBe(true);
          expect(res.body.providers).toContain(EmbeddingsProvider.OPENAI);
        });
    });
  });

  describe('GET /embeddings/providers/:provider/dimension', () => {
    it('should return the dimension for a provider', () => {
      return request(app.getHttpServer())
        .get(`/embeddings/providers/${EmbeddingsProvider.OPENAI}/dimension`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'provider',
            EmbeddingsProvider.OPENAI,
          );
          expect(res.body).toHaveProperty('dimension');
          expect(typeof res.body.dimension).toBe('number');
        });
    });

    it('should handle invalid provider', () => {
      return request(app.getHttpServer())
        .get('/embeddings/providers/INVALID_PROVIDER/dimension')
        .expect(404);
    });
  });

  describe('POST /embeddings/embed', () => {
    it('should embed text successfully', () => {
      return request(app.getHttpServer())
        .post('/embeddings/embed')
        .send({
          text: 'This is a test sentence for embedding.',
          provider: EmbeddingsProvider.OPENAI,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('vector');
          expect(Array.isArray(res.body.vector)).toBe(true);
          expect(res.body.vector.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty(
            'text',
            'This is a test sentence for embedding.',
          );
          expect(res.body).toHaveProperty('dimension');
          expect(res.body.dimension).toBe(res.body.vector.length);
        });
    });

    it('should return 400 for empty text', () => {
      return request(app.getHttpServer())
        .post('/embeddings/embed')
        .send({
          text: '',
          provider: EmbeddingsProvider.OPENAI,
        })
        .expect(400);
    });

    it('should return 400 for missing text', () => {
      return request(app.getHttpServer())
        .post('/embeddings/embed')
        .send({
          provider: EmbeddingsProvider.OPENAI,
        })
        .expect(400);
    });

    it('should embed long text successfully', () => {
      const longText =
        'This is a very long text that contains multiple sentences. '.repeat(
          20,
        );
      return request(app.getHttpServer())
        .post('/embeddings/embed')
        .send({
          text: longText,
          provider: EmbeddingsProvider.OPENAI,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('vector');
          expect(Array.isArray(res.body.vector)).toBe(true);
          expect(res.body.vector.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('text', longText);
          expect(res.body).toHaveProperty('dimension');
          expect(res.body.dimension).toBe(res.body.vector.length);
        });
    });

    it('should handle concurrent embedding requests', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post('/embeddings/embed')
          .send({
            text: `Concurrent test sentence ${i + 1}`,
            provider: EmbeddingsProvider.OPENAI,
          })
          .expect(201),
      );

      const responses = await Promise.all(promises);
      responses.forEach((res, i) => {
        expect(res.body).toHaveProperty('vector');
        expect(res.body).toHaveProperty(
          'text',
          `Concurrent test sentence ${i + 1}`,
        );
        expect(res.body).toHaveProperty('dimension');
      });
    });
  });
});
