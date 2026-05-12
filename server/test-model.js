const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  console.log('🔍 Testing Gemini API...\n');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found in .env file');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  try {
    const result = await model.generateContent("Say 'Hello, my voice assistant is working!'");
    const response = await result.response;
    console.log('✅ Gemini is working!');
    console.log('📝 Response:', response.text());
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();