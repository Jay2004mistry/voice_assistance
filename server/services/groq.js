const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 30000, // 30 seconds timeout
    });
    this.model = 'llama-3.1-8b-instant';
    this.maxRetries = 2;
  }

  /**
   * Get chat completion from Groq API
   * @param {Array} messages - Conversation history
   * @param {String} preferredLanguage - Preferred response language
   * @returns {Object} Response with content and metadata
   */
  async getChatCompletion(messages, preferredLanguage = null) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Invalid messages format');
      }

      console.log('⚡ Calling Groq API with', messages.length, 'messages');
      
      // Build language instruction
      let languageInstruction = '';
      if (preferredLanguage && preferredLanguage !== 'Auto') {
        const languageMap = {
          'English': 'English',
          'Hindi': 'Hindi (हिंदी)',
          'Gujarati': 'Gujarati (ગુજરાતી)',
          'Spanish': 'Spanish (Español)',
          'French': 'French (Français)',
          'German': 'German (Deutsch)',
        };
        const targetLang = languageMap[preferredLanguage] || preferredLanguage;
        languageInstruction = `IMPORTANT: Respond ONLY in ${targetLang} language.`;
      } else {
        languageInstruction = `Detect user's language and respond in the SAME language.`;
      }
      
      const systemMessage = {
        role: 'system',
        content: `You are a helpful AI voice assistant named "Vihil AI". ${languageInstruction} Keep responses concise (2-3 sentences). Be conversational and friendly. Never mention that you are an AI or provide disclaimers about being an AI.`
      };
      
      const messagesWithSystem = [systemMessage, ...messages];
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messagesWithSystem,
        temperature: 0.7,
        max_completion_tokens: 300,
        top_p: 0.9,
      });

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response from Groq API');
      }

      return {
        content: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        model: this.model,
        timestamp: new Date(),
      };
      
    } catch (error) {
      console.error('❌ Groq Error:', error.message);
      
      // Retry logic for specific errors
      if (error.status === 429 && this.maxRetries > 0) { // Rate limited
        this.maxRetries--;
        console.log('Rate limited, retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getChatCompletion(messages, preferredLanguage);
      }
      
      // Return graceful fallback response
      return {
        content: "I'm having trouble connecting to the AI service. Please try again in a moment.",
        tokensUsed: 0,
        model: this.model,
        error: true,
        errorMessage: process.env.NODE_ENV !== 'production' ? error.message : 'AI service error',
      };
    }
  }

  /**
   * Check if API key is valid
   */
  async validateApiKey() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error('❌ API Key validation failed:', error.message);
      return false;
    }
  }
}

module.exports = new GroqService();
