require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const compression= require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const authRoutes   = require('./routes/auth');
const dataRoutes   = require('./routes/data');
const { router: backupRoutes } = require('./routes/backup');
const { startBackupCron } = require('./cron/backup');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Performance Middleware ───────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts in our HTML
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // 10MB for base64 logos

// Rate limiting — prevent brute force on login
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' }
}));

// General API rate limit
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
}));

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/data',   dataRoutes);
app.use('/api/backup', backupRoutes);

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time:   new Date().toISOString(),
    db:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── Serve Frontend ──────────────────────────────────────────────
// Serve all static files (html, css, js) from the appro folder
app.use(express.static(path.join(__dirname, '.'), {
  index: 'index.html',
  setHeaders(res, filePath) {
    // Cache static assets aggressively
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Catch-all: serve index.html for any unknown route (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Connect to MongoDB & Start Server ──────────────────────────
async function start() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connecté');

    // Seed admin user if no users exist
    await seedAdminIfNeeded();

    // Start daily backup cron
    startBackupCron();

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (e) {
    console.error('❌ Impossible de démarrer:', e.message);
    process.exit(1);
  }
}

// ─── Seed initial admin user ──────────────────────────────────────
async function seedAdminIfNeeded() {
  const Document = require('./models/Document');
  const bcrypt   = require('bcryptjs');

  const count = await Document.countDocuments({ col: 'users' });
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await Document.create({
      col: 'users',
      data: {
        id: 1,
        name: 'Administrateur',
        username: 'admin',
        password: hash,
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      }
    });
    console.log('👤 Utilisateur admin créé (admin / admin123) — CHANGEZ LE MOT DE PASSE!');
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('🔄 Arrêt gracieux...');
  await mongoose.connection.close();
  process.exit(0);
});

start();
