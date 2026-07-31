const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  label:      { type: String, required: true },   // e.g. "Auto 2026-07-31 23:59"
  type:       { type: String, enum: ['auto', 'manual'], default: 'auto' },
  createdBy:  { type: String, default: 'system' },
  data:       { type: mongoose.Schema.Types.Mixed, required: true }, // full snapshot
  createdAt:  { type: Date, default: Date.now, index: true },
  expiresAt:  { type: Date },  // set 30 days from createdAt
});

// Auto-expire index — MongoDB will auto-delete docs after expiresAt
backupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Backup', backupSchema);
