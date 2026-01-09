// auth/passport.js
import passport from 'passport';
import { getUserInfo } from './auth.js';
const { AUTH_PROVIDER } = process.env;
// Registrierung
if (AUTH_PROVIDER === 'keycloak') {
  const { keycloakStrategy } = await import('./strategies/keycloak.strategy.js');
  passport.use('keycloak', keycloakStrategy);
}
if (AUTH_PROVIDER === 'ldap') {
  const { ldapStrategy } = await import('./strategies/ldap.strategy.js');
  passport.use('ldap', ldapStrategy);
}
if (AUTH_PROVIDER !== 'keycloak' && AUTH_PROVIDER !== 'ldap') {
  throw new Error(
    'AUTH_PROVIDER must be set to "keycloak" or "ldap", otherwise please implement your own strategy',
  );
}
passport.serializeUser((user, done) => {
  done(null, {
    username: user.username,
    accessToken: AUTH_PROVIDER === 'keycloak' ? user.accessToken : undefined,
    refreshToken: AUTH_PROVIDER === 'keycloak' ? user.refreshToken : undefined,
    role: user.role,
    isCandidate: user.isCandidate || false,
  });
});

passport.deserializeUser(async (obj, done) => {
  let user = await getUserInfo(obj.username, obj.authProvider);
  if (AUTH_PROVIDER === 'keycloak') {
    user.accessToken = obj.accessToken;
    user.refreshToken = obj.refreshToken;
  }
  done(null, user);
});

export default passport;
