import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { router } from './routes/index.routes.js';
import { errorHandler } from './conf/logger/error-handler.middleware.js';
import { getUserInfo, login } from './auth/auth.js';
import { readSecret } from './security/secret-reader.js';
export const app = express();

/**
 * Setup Express middlewares and routes
 */

/**
 * Helmet for setting various HTTP headers for app security
 */
app.use(
  helmet({
    // to avoid clickjacking
    frameguard: {
      action: 'deny',
    },
    xssFilter: true,
    // hide what version of Express is running
    hidePoweredBy: true,

    // to avoid using of sources from other domains
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    // noSniff to hide the MIME type
    noSniff: true,
    // disable the referrer policy
    referrerPolicy: {
      policy: 'no-referrer',
    },
    crossOriginResourcePolicy: {
      // eslint-disable-next-line
      policy: 'same-origin',
    },
    crossOriginEmbedderPolicy: {
      policy: 'same-origin',
    },
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },
  }),
);

/**
 * Body parsers
 */
app.use(express.json());

/**
 * URL-encoded body parser
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Session middleware
 */
app.use(
  session({
    secret: await readSecret('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // need to have the same origin
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }),
);

/**
 * Passport middleware
 * @see https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Passport strategy
 */
passport.use(
  new LocalStrategy(async (username, password, done) => {
    const user = await login(username, password);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  }),
);

/**
 * Passport serialization and deserialization
 */
// @ts-ignore
passport.serializeUser((user, done) => done(null, user.username));
passport.deserializeUser(async (username, done) => {
  const user = await getUserInfo(username);
  done(null, user);
});

/**
 * Health check route
 */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

/**
 * Binding API routes
 */
app.use('/api', router);

/**
 * Error handling middleware
 */
app.use(errorHandler);
