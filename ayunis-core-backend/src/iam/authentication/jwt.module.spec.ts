import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtConfigModule } from './jwt.module';
import { JWT_SECRET } from './application/tokens/jwt-secret.token';
import { authenticationConfig } from '../../config/authentication.config';

describe('JwtConfigModule', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  async function buildModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [authenticationConfig], isGlobal: true }),
        JwtConfigModule,
      ],
    }).compile();
  }

  it('exposes the configured JWT secret via the JWT_SECRET token', async () => {
    process.env.JWT_SECRET = 'an-explicit-signing-secret';

    const moduleRef = await buildModule();

    expect(moduleRef.get(JWT_SECRET)).toBe('an-explicit-signing-secret');
  });

  it('provides a JwtService that round-trips tokens with the shared secret', async () => {
    process.env.JWT_SECRET = 'round-trip-secret';

    const moduleRef = await buildModule();
    const jwtService = moduleRef.get(JwtService);

    const token = jwtService.sign({ sub: 'org-admin-1' }, { expiresIn: '1h' });

    expect(jwtService.verify(token)).toMatchObject({ sub: 'org-admin-1' });
  });
});
