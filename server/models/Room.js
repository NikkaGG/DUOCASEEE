const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  game: {
    type: String,
    required: true,
    enum: ['roll', 'speedcash', 'blackjack', 'crash', 'upgrade']
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    photoUrl: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  maxPlayers: { type: Number, default: 3 },
  isPrivate: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  gameState: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  finishedAt: Date
});

module.exports = mongoose.model('Room', roomSchema);
