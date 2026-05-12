const axios = require('axios');
require('dotenv').config();

async function getRealResponse() {
  console.log('🔍 Testing actual AI response...\n');
  
  try {
    const response = await axios({
      method: 'post',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      data: {
        model: 'openrouter/free',
        messages: [
          { role: 'user', content: 'Say "Hello! I am working perfectly!"' }
        ],
        max_tokens: 200,
      },
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Got response!');
    
    // Extract text from reasoning model
    const choice = response.data.choices[0];
    const message = choice.message;
    
    let aiText = '';
    if (message.content && message.content !== null) {
      aiText = message.content;
      console.log('📝 Content field used');
    } else if (message.reasoning && message.reasoning !== null) {
      aiText = message.reasoning;
      console.log('📝 Reasoning field used');
    } else {
      aiText = 'No text extracted';
    }
    
    console.log('\n📝 AI Said:', aiText);
    console.log('\n🎉 Success! Your voice assistant will work now!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getRealResponse();