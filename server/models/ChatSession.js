const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    default: 'anonymous',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
  },
});

// Remove duplicate index - only keep this one
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);