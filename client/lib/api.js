const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Session management
export async function createSession(userId = null, userAgent = null) {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userAgent,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Session creation failed:', response.status, errorText);
      throw new Error(`Failed to create session: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create session error:', error);
    throw new Error('Cannot connect to server. Make sure backend is running on port 5000');
  }
}

export async function getSession(sessionId) {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get session');
  }
  
  return response.json();
}

// Chat operations
// Chat operations
export async function sendMessage(sessionId, message, conversationHistory = [], preferredLanguage = null) {
  try {
    console.log('📤 Sending message to:', `${API_BASE}/chat/message`);
    console.log('📝 Message:', message);
    console.log('🆔 SessionId:', sessionId);
    console.log('🌍 Preferred language:', preferredLanguage);
    
    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message,
        conversationHistory,
        preferredLanguage, // Add language preference
      }),
    });
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Response data:', data);
    
    if (!data.message) {
      console.error('No message in response:', data);
      throw new Error('No message received from AI');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Send message error:', error);
    throw error;
  }
}

export async function getChatHistory(sessionId, limit = 50, offset = 0) {
  const response = await fetch(
    `${API_BASE}/chat/history/${sessionId}?limit=${limit}&offset=${offset}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to get chat history');
  }
  
  return response.json();
}

export async function clearChatHistory(sessionId) {
  const response = await fetch(`${API_BASE}/chat/history/${sessionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear chat history');
  }
  
  return response.json();
}