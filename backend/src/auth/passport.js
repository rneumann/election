// auth/passport.js
import passport from 'passport';
import { logger } from '../conf/logger/logger.js';
import { ldapStrategy } from './strategies/ldap.strategy.js';
import { getUserInfo } from './auth.js';
import { samlStrategy } from './strategies/saml.strategy.js';

// Registrierung
passport.use('ldap', ldapStrategy);
passport.use('saml', samlStrategy);

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
  const user = await getUserInfo(username);
  logger.debug(`Deserialized user: ${username}`);
  done(null, user);
});

export default passport;
