const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').auth;
const config = require('../config');

const c = wrapController(controller);
const router = express.Router();

// Brute-force protection for credential and email-sending endpoints.
const limiter = (max, windowMinutes) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: config.isTest ? 10_000 : max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });
const loginLimiter = limiter(10, 15);
const emailLimiter = limiter(5, 15);

router.post('/register', loginLimiter, validate(schemas.register), c.register);
router.post('/login', loginLimiter, validate(schemas.login), c.login);
router.post('/forgot-password', emailLimiter, validate(schemas.forgotPassword), c.forgotPassword);
router.post('/reset-password', loginLimiter, validate(schemas.resetPassword), c.resetPassword);
router.get('/invitations/:token', loginLimiter, c.getInvitation);
router.post('/register-invite', loginLimiter, validate(schemas.registerWithInvite), c.registerWithInvite);

router.get('/me', requireAuth, c.me);
router.patch('/password', requireAuth, loginLimiter, validate(schemas.changePassword), c.changePassword);
router.post('/invite', requireAuth, emailLimiter, validate(schemas.invite), c.inviteUser);
router.post('/accept-invite', requireAuth, validate(schemas.acceptInvite), c.acceptInvite);

module.exports = router;
