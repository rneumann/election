import fs from 'fs/promises';
import { Strategy } from '@node-saml/passport-saml';

const idpCert = await fs.readFile(
  new URL('../../../.extras/compose/saml/server.crt', import.meta.url),
  'utf-8',
);
export const samlStrategy = new Strategy(
  {
    callbackUrl: 'http://localhost:3000/auth/saml/callback',
    entryPoint: 'http://localhost:8081/simplesaml/saml2/idp/SSOService.php',
    issuer: 'election',
    idpCert: idpCert,
  },
  (profile, done) => {
    if (!profile) {
      return done(null, false);
    }
    const user = {
      username: profile.uid || profile.email,
      role: 'voter',
    };
    return done(null, user);
  },
);
