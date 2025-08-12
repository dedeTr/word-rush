const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    trim: true
  },
  theme: {
    type: String,
    required: true,
    enum: ['Hewan', 'Buah', 'Negara']
  },
  normalized: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  length: {
    type: Number,
    required: true,
    index: true
  },
  firstLetter: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  lastLetter: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  }
}, {
  timestamps: true
});

// Optimized compound indexes for high-performance validation queries
// Primary validation index - most common query pattern
wordSchema.index({ theme: 1, normalized: 1 }, { unique: true });

// Multi-requirement validation indexes for fast OR queries
wordSchema.index({ theme: 1, firstLetter: 1, length: 1 });
wordSchema.index({ theme: 1, lastLetter: 1, length: 1 });
wordSchema.index({ theme: 1, firstLetter: 1, lastLetter: 1 });

// Individual requirement indexes for specific validations
wordSchema.index({ theme: 1, firstLetter: 1 });
wordSchema.index({ theme: 1, lastLetter: 1 });
wordSchema.index({ theme: 1, length: 1 });

// Text search index for fuzzy matching (optional for future features)
wordSchema.index({ word: 'text', theme: 1 });

module.exports = mongoose.model('Word', wordSchema);
