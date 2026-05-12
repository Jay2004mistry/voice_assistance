const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Create new session
router.post('/', sessionController.createSession);

// Get session info
router.get('/:sessionId', sessionController.getSession);

// Get user sessions
router.get('/user/:userId', sessionController.getUserSessions);

module.exports = router;