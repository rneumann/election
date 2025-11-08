import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { router } from './routes/index.routes.js';
import { errorHandler } from './conf/logger/error-handler.middleware.js';
import { getUserInfo, login } from './auth/auth.js';
export const app = express();

const { SECRET } = process.env;

/**
 * Setup Express middlewares and routes
 */

/**
 * Helmet for setting various HTTP headers for app security
 */
app.use(helmet());

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
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }),
);

/**
 * Passport middleware
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
