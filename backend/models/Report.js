const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: { type: String, required: true },
  target: { type: String, required: true },
  reason: { type: String, required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
