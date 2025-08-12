const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  score: {
    type: Number,
    default: 0
  },
  roundAnswers: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const roundSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  theme: {
    type: String,
    required: true,
    enum: ['Hewan', 'Buah', 'Negara']
  },
  requirements: [{
    type: {
      type: String,
      required: true,
      enum: ['awalan', 'akhiran', 'jumlah']
    },
    description: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    }
  }],
  startTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60000
  },
  answers: [{
    playerId: String,
    username: String,
    answer: String,
    timestamp: Date,
    isValid: Boolean
  }]
}, { _id: false });

const roomSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  players: [playerSchema],
  currentRound: roundSchema,
  isActive: {
    type: Boolean,
    default: false
  },
  ownerId: {
    type: String,
    required: true
  },
  ownerUsername: {
    type: String,
    required: true
  },
  gameSettings: {
    roundDuration: {
      type: Number,
      default: 60, // seconds
      min: 30,
      max: 300
    },
    maxAnswersPerRound: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    minPlayers: {
      type: Number,
      default: 2,
      min: 2,
      max: 10
    },
    maxPlayers: {
      type: Number,
      default: 8,
      min: 2,
      max: 20
    },
    totalRounds: {
      type: Number,
      default: 10,
      min: 5,
      max: 20
    },
    themes: [{
      type: String,
      enum: ['Hewan', 'Buah', 'Negara']
    }]
  },
  currentRoundNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  finalRanking: [{
    playerId: String,
    username: String,
    totalScore: Number,
    rank: Number
  }],
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Optimized indexes for high-performance room operations
// Note: _id is already the primary key, no need for separate roomId index

// Cleanup and maintenance indexes
roomSchema.index({ isActive: 1, lastActivity: 1 });
roomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 1800 }); // Auto-cleanup after 30 minutes

// Player management indexes
roomSchema.index({ 'players.socketId': 1 });
roomSchema.index({ 'players.username': 1 });

// Game state indexes for analytics and monitoring
roomSchema.index({ isActive: 1, createdAt: 1 });
roomSchema.index({ 'currentRound.theme': 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
