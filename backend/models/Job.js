const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  requireResume: {
    type: Boolean,
    default: false
  },
  // Internshala-like optional fields (do not break existing jobs)
  jobType: {
    type: String,
    enum: ['job', 'internship'],
    default: 'job'
  },
  workMode: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    default: 'onsite'
  },
  category: { type: String },
  durationWeeks: { type: Number },
  stipendMin: { type: Number },
  stipendMax: { type: Number },
  openings: { type: Number },
  skills: [{ type: String }],
  perks: [{ type: String }],
  startDate: { type: Date },
  applyBy: { type: Date },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema); 