require('dotenv').config();
const groqService = require('./services/groq');

async function testVoice() {
  console.log('🎤 Testing Groq for Voice Assistant...\n');
  
  const messages = [
    { role: 'user', content: 'Hello! What is your name?' }
  ];
  
  const response = await groqService.getChatCompletion(messages, 'English');
  console.log('📝 Response:', response.content);
  console.log(`⚡ Response time: ${response.responseTime}ms`);
}

testVoice();