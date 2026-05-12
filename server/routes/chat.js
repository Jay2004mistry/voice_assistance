const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Send message and get AI response
router.post('/message', chatController.sendMessage);

// Get chat history for a session
router.get('/history/:sessionId', chatController.getChatHistory);

// Clear chat history for a session
router.delete('/history/:sessionId', chatController.clearChatHistory);

// Test route to check if API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Chat API is working!' });
});

module.exports = router;