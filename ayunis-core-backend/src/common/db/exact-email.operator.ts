import { Raw, type FindOperator } from 'typeorm';

export function exactEmail(email: string): FindOperator<string> {
  const normalizedEmail = email.trim().toLowerCase();
  return Raw((alias) => `LOWER(${alias}) = :normalizedEmail`, {
    normalizedEmail,
  }) as FindOperator<string>;
}
