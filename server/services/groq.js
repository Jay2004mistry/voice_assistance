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
    this.model = 'llama-3.3-70b-versatile';
    this.defaultMaxRetries = 2;
  }

  /**
   * Get chat completion from Groq API
   * @param {Array} messages - Conversation history
   * @param {String} preferredLanguage - Preferred response language
   * @returns {Object} Response with content and metadata
   */
  async getChatCompletion(messages, preferredLanguage = null, reqRetries = null) {
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
        content: `You are "Vihil AI", a premium, helpful, and highly intelligent voice assistant developed by Vihil Infotech.
${languageInstruction}
Key Instructions:
- Keep responses conversational, friendly, and concise (max 2-3 sentences).
- Use proper script for the language (e.g., Hindi in Devanagari, Gujarati in Gujarati script).
- Be helpful and direct. 
- Never mention that you are an AI or provide standard AI disclaimers.
- Act as a real assistant would.
- Do not explain how you work or what models you use unless specifically asked.
- If the user greets you, greet them back warmly as "Vihil AI".`
      };
      
      const messagesWithSystem = [systemMessage, ...messages];
      
      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messagesWithSystem,
        temperature: 0.6, // Slightly lower for better consistency
        max_completion_tokens: 500, // Increased for better accuracy
        top_p: 0.9,
      });

      const responseTime = Date.now() - startTime;

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response from Groq API');
      }

      return {
        content: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        model: this.model,
        responseTime: responseTime,
        timestamp: new Date(),
      };
      
    } catch (error) {
      console.error('❌ Groq Error:', error.message);
      
      // Retry logic for rate limiting
      const currentRetries = reqRetries || this.defaultMaxRetries;
      if (error.status === 429 && currentRetries > 0) {
        console.log(`Rate limited, retrying (${currentRetries} left) in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getChatCompletion(messages, preferredLanguage, currentRetries - 1);
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
