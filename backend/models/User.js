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
 
  profile: {
    name: String,
    email: String,
    phone: String,
    preferredCategories: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 