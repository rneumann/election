// auth/passport.js
import passport from 'passport';
import { logger } from '../conf/logger/logger.js';
import { ldapStrategy } from './strategies/ldap.strategy.js';
import { getUserInfo } from './auth.js';
import { samlStrategy } from './strategies/saml.strategy.js';
import { keycloakStrategy } from './strategies/keycloak.strategy.js';

// Registrierung
passport.use('ldap', ldapStrategy);
passport.use('saml', samlStrategy);
passport.use('oidc_kc', keycloakStrategy);

passport.serializeUser((user, done) => {
  done(null, {
    username: user.username,
    authProvider: user.authProvider,
    role: user.role,
  });
});

passport.deserializeUser(async (obj, done) => {
  const user = await getUserInfo(obj.username, obj.authProvider);
  logger.debug(`Deserialized user: ${JSON.stringify(user)}`);
  done(null, user);
});

export default passport;
