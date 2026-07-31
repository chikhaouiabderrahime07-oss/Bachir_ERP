const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Document = require('../models/Document');

const router = express.Router();
const JWT_EXPIRY = '12h';

// ─── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Identifiants manquants' });

    // Find user document
    const doc = await Document.findOne({ col: 'users', 'data.username': username.toLowerCase().trim() });
    if (!doc) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const user = doc.data;
    if (user.active === false) return res.status(403).json({ error: 'Compte désactivé' });

    // Compare password (supports both bcrypt and legacy plain-text for migration)
    let passwordOk = false;
    if (user.password?.startsWith('$2')) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      passwordOk = (password === user.password); // legacy plain-text
      // Upgrade to bcrypt on successful login
      if (passwordOk) {
        const hash = await bcrypt.hash(password, 10);
        await Document.updateOne({ _id: doc._id }, { $set: { 'data.password': hash } });
      }
    }

    if (!passwordOk) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (e) {
    console.error('[AUTH/login]', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/refresh ─────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const age = Date.now()/1000 - decoded.iat;
    if (age > 86400) return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
    const newToken = jwt.sign(
      { id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;
