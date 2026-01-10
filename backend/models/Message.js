const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  edited: { type: Boolean, default: false },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);