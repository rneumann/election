import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import swaggerUiExpress from 'swagger-ui-express';
import cors from 'cors';
import { router } from './routes/index.routes.js';
import { errorHandler } from './conf/logger/error-handler.middleware.js';
import { readSecret } from './security/secret-reader.js';
import { swaggerSpec } from './conf/swagger/swagger.js';
import { healthRouter } from './routes/health.route.js';
import passport from './auth/passport.js';
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
      policy: 'same-origin',
    },
    crossOriginEmbedderPolicy: {
      policy: 'require-corp',
    },
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },
  }),
);

app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
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
      maxAge: 1000 * 60 * 60,
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
 * Health route
 */
app.use('/', healthRouter);

/**
 * Binding API routes
 */
app.use('/api', router);

/**
 * Error handling middleware
 */
app.use(errorHandler);

/**
 * Swagger UI
 */
app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerSpec));
