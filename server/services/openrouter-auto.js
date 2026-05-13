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