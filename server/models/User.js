const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  firstName: String,
  username: String,
  photoUrl: String,
  nickname: {
    type: String,
    required: true
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 },
    rating: { type: Number, default: 1000 }
  },
  balance: {
    chips: { type: Number, default: 1000 },
    coins: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
