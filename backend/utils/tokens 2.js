const crypto = require('crypto');

// Random single-use tokens (password resets, invitations). Only the hash is stored, so a database leak doesn't expose usable links.
const generateToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = { generateToken, hashToken };
