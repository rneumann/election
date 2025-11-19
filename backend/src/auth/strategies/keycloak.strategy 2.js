import { Issuer } from 'openid-client';
import dotenv from 'dotenv';
import { logger } from '../../conf/logger/logger.js';
dotenv.config();

const { KC_BASE_URL, KC_REALM, CLIENT_ID, CLIENT_SECRET } = process.env;
logger.info('Keycloak strategy initialized', { KC_BASE_URL, KC_REALM, CLIENT_ID, CLIENT_SECRET });

const kcIssuer = await Issuer.discovery(`${KC_BASE_URL}/realms/${KC_REALM}`);
const kcClient = new kcIssuer.Client({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: ['http://localhost:5173/*'],
  response_types: ['code'],
});

export const keycloakStrategy = new Strategy(
  {
    kcClient,
    params: {
      scope: 'openid profile email',
    },
  },
  (tokenSet, userinfo, done) => {
    if (!tokenSet) {
      return done(null, false);
    }

    const user = {
      username: userinfo.preferred_username || tokenSet.claims().sub,
      role: 'voter',
    };

    return done(null, user);
  },
);
