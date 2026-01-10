const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // username of the recipient
  message: { type: String, required: true },
  type: { type: String, enum: ['selection', 'message', 'application', 'interview'], default: 'selection' },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
