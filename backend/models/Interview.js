const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  interviewer: { type: String, required: true }, // Job Provider username
  applicant: { type: String, required: true }, // Job Seeker username
  jobTitle: { type: String, required: true }, // Denormalized for easier display
  date: { type: Date, required: true },
  time: { type: String, required: true },
  type: { type: String, enum: ['video', 'phone', 'in-person'], required: true },
  link: { type: String } // Meeting link or address
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);