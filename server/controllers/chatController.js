const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const aiService = require('../services/groq'); // Using Groq service

// Send message and get AI response
exports.sendMessage = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    
    const { sessionId, message, conversationHistory, preferredLanguage } = req.body;

    if (!sessionId || !message) {
      console.log('Missing fields:', { sessionId, message });
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Check if session exists, create if not
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      console.log('Session not found, creating new session:', sessionId);
      session = new ChatSession({
        sessionId,
        userId: 'anonymous',
        metadata: {
          userAgent: req.get('user-agent'),
          ipAddress: req.ip,
        },
      });
      await session.save();
    }

    // Save user message
    const userMessage = new Message({
      sessionId,
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    await userMessage.save();
    console.log('User message saved');

    // Update session timestamp
    await ChatSession.findOneAndUpdate(
      { sessionId },
      { updatedAt: new Date() }
    );

    // Prepare conversation history for AI
    let messagesForAI = [];

    if (conversationHistory && conversationHistory.length > 0) {
      messagesForAI = conversationHistory;
    } else {
      const recentMessages = await Message.find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();
      
      messagesForAI = recentMessages.reverse().map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    }

    console.log('Sending to Groq API. Messages count:', messagesForAI.length);
    console.log('🌍 Preferred language:', preferredLanguage || 'Auto');

    // Get AI response from Groq with language preference
    const aiResponse = await aiService.getChatCompletion(messagesForAI, preferredLanguage);
    console.log('AI response received');

    // Save AI message
    const assistantMessage = new Message({
      sessionId,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: {
        tokensUsed: aiResponse.tokensUsed || 0,
        responseTime: aiResponse.responseTime || 0,
      },
    });
    await assistantMessage.save();

    res.json({
      message: aiResponse.content,
      messageId: assistantMessage._id,
      timestamp: assistantMessage.timestamp,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to process message' });
  }
};

// Get chat history for a session
exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await Message.find({ sessionId })
      .sort({ timestamp: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const total = await Message.countDocuments({ sessionId });

    res.json({
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
};

// Clear chat history for a session
exports.clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Message.deleteMany({ sessionId });
    await ChatSession.findOneAndUpdate(
      { sessionId },
      { updatedAt: new Date() }
    );

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
};