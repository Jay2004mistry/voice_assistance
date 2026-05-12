const axios = require('axios');
require('dotenv').config();

async function testWorkingModels() {
  console.log('🔍 Testing your OpenRouter key with current free models...\n');
  
  const models = [
    'openrouter/free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
  ];

  for (const model of models) {
    try {
      console.log(`Testing: ${model}`);
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'Say "Hello, I am working!"' }],
          max_tokens: 50,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      
      // Extract the actual response text
      const reply = response.data.choices?.[0]?.message?.content || 
                    response.data.choices?.[0]?.text || 
                    response.data.content ||
                    'No text response';
      
      console.log(`✅ WORKING: ${model}`);
      console.log(`📝 Response: ${reply}\n`);
      console.log(`🎉 SUCCESS! Your API key is working!\n`);
      return true;
      
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.log(`❌ Failed: ${model} - ${msg}\n`);
    }
  }
  
  console.log('💡 Your key worked with openrouter/free!');
  console.log('📋 Continue to next step to fix the response parsing.\n');
  return false;
}

testWorkingModels();