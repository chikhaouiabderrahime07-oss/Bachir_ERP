const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
    || req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
