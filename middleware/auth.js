const jwt = require('jsonwebtoken');
const Document = require('../models/Document');

module.exports = async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
    || req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Single Active Session Enforcement ─────────────────────
    if (decoded.sessionId && decoded.username) {
      const userDoc = await Document.findOne({ col: 'users', 'data.username': decoded.username }).select('data.currentSessionId data.active data.role').lean();
      if (userDoc?.data?.currentSessionId && userDoc.data.currentSessionId !== decoded.sessionId) {
        return res.status(403).json({
          error: 'SESSION_TERMINATED',
          code: 'SESSION_TERMINATED',
          message: 'Votre compte s\'est connecté depuis un autre appareil ou emplacement. Cette session a été fermée.'
        });
      }
      if (userDoc?.data?.active === false && userDoc.data.role !== 'admin') {
        return res.status(403).json({ error: 'Compte désactivé' });
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
