const ChatSession = require('../models/ChatSession');
const { v4: uuidv4 } = require('uuid');

// Create new session
exports.createSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const { userId, userAgent, ipAddress } = req.body;

    const session = new ChatSession({
      sessionId,
      userId: userId || 'anonymous',
      metadata: {
        userAgent: userAgent || req.get('user-agent'),
        ipAddress: ipAddress || req.ip,
      },
    });

    await session.save();

    res.json({
      sessionId,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

// Get session info
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const Message = require('../models/Message');
    const messageCount = await Message.countDocuments({ sessionId });

    res.json({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
};

// Get user sessions
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get message count for each session
    const Message = require('../models/Message');
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await Message.countDocuments({ sessionId: session.sessionId });
        return { ...session, messageCount };
      })
    );

    res.json(sessionsWithCounts);
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};