const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  roomId: String,
  game: {
    type: String,
    required: true
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    bet: Number,
    winnings: Number,
    isWinner: Boolean
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gameState: mongoose.Schema.Types.Mixed,
  duration: Number, // в миллисекундах
  createdAt: { type: Date, default: Date.now }
});

gameHistorySchema.index({ createdAt: -1 });
gameHistorySchema.index({ 'players.userId': 1 });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
