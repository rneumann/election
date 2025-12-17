// auth/passport.js
import passport from 'passport';
import { ldapStrategy } from './strategies/ldap.strategy.js';
import { getUserInfo } from './auth.js';
import { keycloakStrategy } from './strategies/keycloak.strategy.js';

// Registrierung
passport.use('ldap', ldapStrategy);
//passport.use('saml', samlStrategy);
passport.use('oidc_kc', keycloakStrategy);

passport.serializeUser((user, done) => {
  done(null, {
    username: user.username,
    authProvider: user.authProvider,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
    role: user.role,
    isCandidate: user.isCandidate || false,
  });
});

passport.deserializeUser(async (obj, done) => {
  let user = await getUserInfo(obj.username, obj.authProvider);
  if (obj.authProvider === 'keycloak') {
    user.accessToken = obj.accessToken;
    user.refreshToken = obj.refreshToken;
  }
  done(null, user);
});

export default passport;
