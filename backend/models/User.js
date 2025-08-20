const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['jobseeker', 'jobprovider'],
    required: true
  },
  // Optional: add more profile fields as needed
  profile: {
    name: String,
    email: String,
    phone: String,
    // Add more fields for jobseeker or jobprovider as needed
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 