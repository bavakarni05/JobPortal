const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  blocker: { type: String, required: true },
  blocked: { type: String, required: true },
}, { timestamps: true });

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = mongoose.model('Block', BlockSchema);
