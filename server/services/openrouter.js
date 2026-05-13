const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    // Verified working free models as of May 2026
    this.models = [
      'tencent/hy3-preview:free',
      'nvidia/nemotron-3-super:free',
      'inclusionai/ling-2.6-1t:free',
      'z-ai/glm-4.5-air:free',
      'minimax/minimax-m2.5:free',
      'google/gemma-4-31b-it:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
    ];
    this.currentIndex = 0;
  }

  async getChatCompletion(messages) {
    let lastError = null;
    
    // Add system message with memory instructions
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI voice assistant. Keep responses concise (2-3 sentences). Be conversational and friendly. Never mention that you are an AI or provide disclaimers about being an AI.

IMPORTANT INSTRUCTIONS FOR REMEMBERING USER INFORMATION:
- Pay close attention to any personal information the user shares (name, preferences, details)
- Remember the user's name when they introduce themselves
- Always use the user's name when you know it in follow-up conversations
- If the user asks about information they already shared, refer back to the conversation history to provide accurate answers
- Be proactive in remembering and referencing details they've mentioned`
    };
    
    const messagesWithSystem = [systemMessage, ...messages];
    
    // Try each model until one works
    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      try {
        console.log(`🔄 Trying model ${i + 1}/${this.models.length}: ${model}`);
        
        const response = await axios({
          method: 'post',
          url: `${this.baseURL}/chat/completions`,
          data: {
            model: model,
            messages: messagesWithSystem,
            temperature: 0.7,
            max_tokens: 500,
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Voice Assistant',
          },
          timeout: 45000, // Increased timeout
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          const aiResponse = response.data.choices[0].message?.content || 
                            response.data.choices[0].text ||
                            "Hello! How can I help you today?";
          console.log(`✅ Success with model: ${model}`);
          console.log('📝 Response preview:', aiResponse.substring(0, 100));
          
          return {
            content: aiResponse,
            tokensUsed: response.data?.usage?.total_tokens || 0,
          };
        }
      } catch (error) {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.log(`❌ Model ${model} failed: ${status} - ${errorMsg}`);
        lastError = error;
        // Wait 2 seconds before next model
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // If all models fail, return a fallback response
    console.log('⚠️ All models failed, using fallback response');
    return {
      content: "Hello! I'm your AI voice assistant. How can I help you today?",
      tokensUsed: 0,
    };
  }
}

module.exports = new OpenRouterService();
