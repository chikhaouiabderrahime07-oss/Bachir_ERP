const jwt = require('jsonwebtoken');
const Document = require('../models/Document');

// Short in-memory cache of the user's session state. Without it EVERY api call
// did an extra MongoDB read just to check the session (doubling DB load).
const SESSION_TTL_MS = 5000;
const cache = new Map(); // username -> { t, v }

async function getUserState(username) {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.t < SESSION_TTL_MS) return hit.v;
  const doc = await Document.findOne({ col: 'users', 'data.username': username })
    .select('data.currentSessionId data.active data.role').lean();
  const v = doc?.data || null;
  cache.set(username, { t: Date.now(), v });
  if (cache.size > 500) cache.clear();
  return v;
}

/** Called on login so the previous session is rejected immediately. */
function invalidateUser(username) { cache.delete(username); }

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
    || req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Single Active Session Enforcement ─────────────────────
    if (decoded.sessionId && decoded.username) {
      const state = await getUserState(decoded.username);
      if (state?.currentSessionId && state.currentSessionId !== decoded.sessionId) {
        return res.status(403).json({
          error: 'SESSION_TERMINATED',
          code: 'SESSION_TERMINATED',
          message: 'Votre compte s\'est connecté depuis un autre appareil ou emplacement. Cette session a été fermée.'
        });
      }
      if (state?.active === false && state.role !== 'admin') {
        return res.status(403).json({ error: 'Compte désactivé' });
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = authMiddleware;
module.exports.invalidateUser = invalidateUser;
