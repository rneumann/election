import dotenv from 'dotenv';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import { logger } from '../../conf/logger/logger.js';

dotenv.config();

const { KC_BASE_URL, KC_REALM, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

export const keycloakStrategy = new OAuth2Strategy(
  {
    authorizationURL: `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/auth`,
    tokenURL: `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/token`,
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: REDIRECT_URI,
    scope: 'openid profile email',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      logger.debug('Access token received', accessToken);
      logger.debug('Fetching userinfo');
      const res = await axios.get(
        `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/userinfo`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      logger.debug('Userinfo fetched', res);
      const userinfo = await res.data;

      const user = {
        username: userinfo.preferred_username || userinfo.sub,
        accessToken,
        profile: userinfo,
        authProvider: 'keycloak',
      };

      done(null, user);
    } catch (err) {
      done(err);
    }
  },
);
