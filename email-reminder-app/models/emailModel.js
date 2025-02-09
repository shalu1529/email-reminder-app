const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  email: String,
  name: String,
  domain: String,
  receivedAt: Date,
  replied: { type: Boolean, default: false }
});

module.exports = mongoose.model('EmailEntry', emailSchema);
