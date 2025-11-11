import { Strategy } from 'passport-local';
import { login } from '../auth.js';

export const ldapStrategy = new Strategy(async (username, password, done) => {
  const user = await login(username, password);
  if (!user) {
    return done(null, false);
  }
  return done(null, user);
});
