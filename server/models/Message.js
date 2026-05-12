// Message MongoDB model
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    ref: 'ChatSession',
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    processingTime: Number,
    tokensUsed: Number,
  },
});

messageSchema.index({ sessionId: 1, timestamp: 1 });
messageSchema.index({ sessionId: 1, role: 1 });

module.exports = mongoose.model('Message', messageSchema);