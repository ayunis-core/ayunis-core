import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

/** An optional http(s) URL, validated trimmed as the config factories read it. */
export function IsOptionalHttpUrl(): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsUrl({
      require_protocol: true,
      require_tld: false,
      protocols: ['http', 'https'],
    }),
  );
}
