const Groq = require('groq-sdk');

class GroqService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.model = 'llama-3.1-8b-instant';
  }

  async getChatCompletion(messages, preferredLanguage = null) {
    try {
      console.log('⚡ Calling Groq API...');
      
      let languageInstruction = '';
      if (preferredLanguage && preferredLanguage !== 'Auto') {
        const languageMap = {
          'English': 'English',
          'Hindi': 'Hindi (हिंदी)',
          'Gujarati': 'Gujarati (ગુજરાતી)',
          'Spanish': 'Spanish (Español)',
        };
        const targetLang = languageMap[preferredLanguage] || preferredLanguage;
        languageInstruction = `IMPORTANT: Respond ONLY in ${targetLang} language.`;
      } else {
        languageInstruction = `IMPORTANT: Detect user's language and respond in the SAME language.`;
      }
      
      const systemMessage = {
        role: 'system',
        content: `You are a helpful AI voice assistant named "Vihil AI". ${languageInstruction} Keep responses concise (2-3 sentences). Be conversational and friendly.`
      };
      
      const messagesWithSystem = [systemMessage, ...messages];
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messagesWithSystem,
        temperature: 0.7,
        max_completion_tokens: 300,
      });
      
      return {
        content: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        responseTime: 0,
      };
      
    } catch (error) {
      console.error('❌ Groq Error:', error.message);
      return {
        content: "Hello! I'm Vihil AI, your voice assistant. How can I help you?",
        tokensUsed: 0,
        responseTime: 0,
      };
    }
  }
}

module.exports = new GroqService();