// import fs from 'fs/promises';
// import { Strategy } from '@node-saml/passport-saml';

// const { CALLBACK_URL_SAML, ENTRY_POINT_SAML, ISSUER_SAML } = process.env;

// const idpCert = await fs.readFile(
//   new URL('../../../.extras/compose/saml/server.crt', import.meta.url),
//   'utf-8',
// );
// export const samlStrategy = new Strategy(
//   {
//     callbackUrl: CALLBACK_URL_SAML,
//     entryPoint: ENTRY_POINT_SAML,
//     issuer: ISSUER_SAML,
//     idpCert: idpCert,
//   },
//   (profile, done) => {
//     if (!profile) {
//       return done(null, false);
//     }
//     const user = {
//       username: profile.uid || profile.email,
//       role: 'voter',
//       authProvider: 'saml',
//     };
//     return done(null, user);
//   },
// );
