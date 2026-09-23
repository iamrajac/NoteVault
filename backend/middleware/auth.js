const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const config = require('../config');
const { unauthorized } = require('../utils/errors');

const TOKEN_TYPE = 'access';

function signAccessToken(userId) {
  return jwt.sign({ userId, typ: TOKEN_TYPE }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Returns the user for a token, or null if the token is invalid/expired or the user no longer exists.
async function userFromToken(token) {
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  if (payload.typ !== TOKEN_TYPE || !payload.userId) return null;
  return prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, name: true } });
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await userFromToken(bearerToken(req));
    if (!user) return next(unauthorized('Your session has expired. Please log in again.'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, signAccessToken, userFromToken };
