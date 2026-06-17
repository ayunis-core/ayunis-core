import { describe, expect, it } from 'vitest';

import { bedrock, resolveAwsRegion } from './bedrock-provider';

describe('bedrock', () => {
  it('names the provider bedrock:<model> and exposes a stream function', () => {
    const provider = bedrock({
      model: 'anthropic.claude-sonnet-4-20250514-v1:0',
      awsRegion: 'eu-central-1',
      awsAccessKey: 'AKIA-test',
      awsSecretKey: 'secret-test',
    });
    expect(provider.name).toBe(
      'bedrock:anthropic.claude-sonnet-4-20250514-v1:0',
    );
    expect(typeof provider.stream).toBe('function');
  });

  it('constructs with region only (AWS credential chain)', () => {
    const provider = bedrock({ model: 'anthropic.claude-3-5-haiku-v1:0' });
    expect(provider.name).toBe('bedrock:anthropic.claude-3-5-haiku-v1:0');
    expect(typeof provider.stream).toBe('function');
  });
});

describe('resolveAwsRegion', () => {
  it('prefers the explicit option over env and default', () => {
    expect(resolveAwsRegion('eu-west-1', { AWS_REGION: 'us-west-2' })).toBe(
      'eu-west-1',
    );
  });

  it('falls back to AWS_REGION then AWS_DEFAULT_REGION', () => {
    expect(resolveAwsRegion(undefined, { AWS_REGION: 'eu-central-1' })).toBe(
      'eu-central-1',
    );
    expect(
      resolveAwsRegion(undefined, { AWS_DEFAULT_REGION: 'ap-south-1' }),
    ).toBe('ap-south-1');
  });

  it('uses us-east-1 when nothing is set', () => {
    expect(resolveAwsRegion(undefined, {})).toBe('us-east-1');
  });
});
