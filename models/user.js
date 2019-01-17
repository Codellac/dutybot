const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: String,
  date: Number,
  status: String,
  phone: String
});

const User = mongoose.model('User', userSchema);

module.exports = User;