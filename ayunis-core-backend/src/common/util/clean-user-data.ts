import { User } from 'src/iam/users/domain/user.entity';

export function cleanUserData(user: User): User {
  const cleanUser = new User({
    ...user,
    passwordHash: '',
  });
  return cleanUser;
}
