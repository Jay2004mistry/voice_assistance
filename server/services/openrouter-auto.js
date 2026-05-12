const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    // List of working free models (tried and tested)
    this.models = [
      'meta-llama/llama-3.2-3b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'mistralai/mistral-7b-instruct:free'
    ];
    this.currentModelIndex = 0;
  }

  async getChatCompletion(messages) {
    let lastError = null;
    
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
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Voice Assistant',
          },
          timeout: 30000,
        });

        console.log(`✅ Success with model: ${model}`);
        
        let aiResponse = "Hello! How can I help you today?";
        if (response.data && response.data.choices && response.data.choices.length > 0) {
          const choice = response.data.choices[0];
          if (choice.message && choice.message.content) {
            aiResponse = choice.message.content;
          }
        }
        
        return {
          content: aiResponse,
          tokensUsed: response.data?.usage?.total_tokens || 0,
        };
        
      } catch (error) {
        console.error(`❌ Model ${model} failed:`, error.response?.data?.error?.message || error.message);
        lastError = error;
        continue;
      }
    }
    
    // If all models failed, return fallback response
    console.error('All models failed, using fallback response');
    return {
      content: "Hello! I'm your AI voice assistant. How can I help you today?",
      tokensUsed: 0,
    };
  }
}

module.exports = new OpenRouterService();