const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantName: { type: String },
  age: { type: Number },
  address: { type: String },
  email: { type: String },
  contactNo: { type: String },
  resumePath: { type: String },
  status: {
    type: String,
    enum: ['applied', 'reviewed', 'accepted', 'rejected'],
    default: 'applied'
  }
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema); 