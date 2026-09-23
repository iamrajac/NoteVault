require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function required(name, fallbackForDev) {
  const value = process.env[name];
  if (value) return value;
  if (isProduction || fallbackForDev === undefined) {
    throw new Error(`Missing required environment variable ${name}. See backend/.env.example.`);
  }
  return fallbackForDev;
}

const jwtSecret = required('JWT_SECRET', isTest ? 'test-secret-that-is-long-enough-for-hs256-signing' : undefined);
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
}

const frontendUrl = required('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, '');

// Comma-separated list of browser origins allowed to call the API. Defaults to the frontend URL.
const corsOrigins = (process.env.CORS_ORIGINS || frontendUrl)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

module.exports = {
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5069,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl,
  corsOrigins,
  // Set when running behind a reverse proxy / load balancer (Render, Railway, Nginx...) so rate limiting sees real client IPs.
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
  // Any SMTP provider (Resend, Brevo, SendGrid, Mailgun...) via SMTP_HOST/SMTP_USER/SMTP_PASS,
  // or Gmail via SMTP_EMAIL + SMTP_APP_PASSWORD.
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD,
    from: process.env.SMTP_FROM || process.env.SMTP_EMAIL || process.env.SMTP_USER,
  },
  enableCron: process.env.ENABLE_CRON !== 'false' && !isTest,
};
