import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import swaggerUiExpress from 'swagger-ui-express';
import cors from 'cors';
import { RedisStore } from 'connect-redis';
import { router } from './routes/index.routes.js';
import { errorHandler } from './conf/logger/error-handler.middleware.js';
import { readSecret } from './security/secret-reader.js';
import { swaggerSpec } from './conf/swagger/swagger.js';
import { healthRouter } from './routes/health.route.js';
import passport from './auth/passport.js';
import { logger } from './conf/logger/logger.js';
import { voterRouter } from './routes/voter.routes.js';
import { candidateRouter } from './routes/candidate.route.js';
import { importRouter } from './routes/upload.route.js';
import { exportRoute } from './routes/export.route.js';
import { verifyCsrfToken } from './security/csrf-logic.js';
import { writeAuditLog } from './audit/auditLogger.js';
import { auditRouter } from './routes/audit.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { redisClient } from './conf/redis/redis-client.js';

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
    store: new RedisStore({
      client: redisClient,
    }),
    secret: await readSecret('SESSION_SECRET'),
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // need to have the same origin
      maxAge: 1000 * (60 * 3 + 45), // 3.45 minutes
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
 * Session fingerprint for protection against hijacking
 */
app.use((req, res, next) => {
  if (!req.session || !req.user) {
    return next();
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip;
  const ua = req.headers['user-agent'] || 'unknown';

  const fingerprint = crypto
    .createHash('sha256')
    .update(process.env.INTERNAL_FINGERPRINT_SALT + ip + ua) // Pepper aus env nutzen
    .digest('hex');

  if (req.session.freshUser || !req.session.fingerprint) {
    logger.debug('Setting initial session fingerprint');
    req.session.fingerprint = fingerprint;
    delete req.session.freshUser;
    return next();
  }

  if (fingerprint !== req.session.fingerprint) {
    logger.warn('Session fingerprint mismatch - Potential Hijacking');

    writeAuditLog({
      actionType: 'SESSION_HIJACKING_SUSPECTED',
      level: 'CRITICAL',
      actorId: req.user.username,
      actorRole: req.user.role,
      details: {
        reason: 'fingerprint_mismatch',
        detected_ip: ip,
        detected_ua: ua,
      },
    }).catch((e) => logger.error(e));

    return req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(401).json({ message: 'Unauthorized' });
    });
  }

  next();
});

app.use(verifyCsrfToken);

/** Session Timeout */
app.use(async (req, res, next) => {
  if (!req.session || !req.user) {
    return next();
  }
  const user = req.user;
  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  const diff = now - lastActivity;

  logger.info(`The if condition: ${diff > 3 * 60 * 1000}, ${diff} > ${3 * 60 * 1000}`);
  if (diff > 3 * 60 * 1000) {
    logger.debug('Session timeout detected logging out user');

    // Audit Log bei Timeout
    if (user) {
      writeAuditLog({
        actionType: 'SESSION_TIMEOUT',
        level: 'INFO',
        actorId: user.username,
        actorRole: user.role,
        details: {
          last_activity: new Date(lastActivity).toISOString(),
          provider: user.authProvider,
        },
      }).catch((e) => logger.error(e));
    }

    req.session.destroy(() => {});
    res.clearCookie('connect.sid', { path: '/', httpOnly: true });

    if (user?.authProvider === 'ldap') {
      res.clearCookie('PHPSESSID', { path: '/', httpOnly: true });
      res.clearCookie('PHPSESSIDIDP', { path: '/', httpOnly: true });
      res.clearCookie('PGADMIN_LANGUAGE', { path: '/', httpOnly: true });
    }

    // if (user?.authProvider === 'saml') {
    //   res.clearCookie('SimpleSAMLAuthTokenIdp', { path: '/', httpOnly: true });
    //   res.clearCookie('PHPSESSIDIDP', { path: '/', httpOnly: true });
    // }

    logger.debug('User logged out successfully');
    return res.status(401).json({ message: 'Session expired' });
  }

  logger.debug('Last activity updated');
  req.session.lastActivity = now;
  next();
});

// Swagger muss VOR den Routen und VOR dem ErrorHandler kommen!
// app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerSpec));

/**
 * Health route
 */
app.use('/', healthRouter);

/**
 * Binding API routes
 */
app.use('/api', router);
app.use('/api/voter', voterRouter);
app.use('/api/candidates', candidateRouter);
app.use('/api/upload/', importRouter);
app.use('/api/export/', exportRoute);
// NEU: Audit API Route registrieren
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);

/**
 * Error handling middleware
 */
app.use(errorHandler);

/**
 * Swagger UI
 */
app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerSpec));
