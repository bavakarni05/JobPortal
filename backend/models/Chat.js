const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);