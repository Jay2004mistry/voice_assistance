const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      console.error('❌ GOOGLE_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });
  }

  async getChatCompletion(messages, preferredLanguage = null) {
    try {
      console.log('🤖 Calling Gemini API...');
      console.log('🌍 Preferred language:', preferredLanguage || 'Auto detect');
      
      // Build language instruction based on user preference
      let languageInstruction = '';
      if (preferredLanguage && preferredLanguage !== 'Auto') {
        const languageMap = {
          'English': 'English',
          'Hindi': 'Hindi (हिंदी)',
          'Gujarati': 'Gujarati (ગુજરાતી)',
          'Spanish': 'Spanish (Español)',
        };
        const targetLang = languageMap[preferredLanguage] || preferredLanguage;
        languageInstruction = `IMPORTANT: You MUST respond ONLY in ${targetLang} language. Do not use any other language.`;
      } else {
        languageInstruction = `IMPORTANT: Detect the user's language and respond in the SAME language. If user speaks Hindi, respond in Hindi. If Gujarati, respond in Gujarati. If Spanish, respond in Spanish. Default to English if unknown.`;
      }
      
      // System instruction with language support
      const systemInstruction = `You are a multilingual AI voice assistant. 
      
      ${languageInstruction}
      
      Additional rules:
      1. Keep responses conversational and friendly.
      2. Use natural, spoken language appropriate for text-to-speech.
      3. Keep responses concise (2-3 sentences maximum for voice).
      4. Be helpful and engaging.`;
      
      // Convert messages to Gemini format
      let conversationHistory = `${systemInstruction}\n\n`;
      
      for (const msg of messages) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        conversationHistory += `${role}: ${msg.content}\n`;
      }
      
      conversationHistory += `Assistant: `;
      
      const result = await this.model.generateContent(conversationHistory);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Gemini response received');
      console.log('📝 Response preview:', text.substring(0, 100));
      
      return {
        content: text,
        tokensUsed: await response.usageMetadata?.totalTokenCount || 0,
      };
      
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);
      
      // Return a friendly fallback response in the preferred language
      let fallbackMessage = "Hello! I'm your AI voice assistant. How can I help you today?";
      if (preferredLanguage === 'Hindi') {
        fallbackMessage = "नमस्ते! मैं आपका AI वॉयस असिस्टेंट हूं। मैं आपकी कैसे मदद कर सकता हूं?";
      } else if (preferredLanguage === 'Gujarati') {
        fallbackMessage = "નમસ્તે! હું તમારો AI વૉઇસ સહાયક છું. હું તમારી શી રીતે મદદ કરી શકું?";
      } else if (preferredLanguage === 'Spanish') {
        fallbackMessage = "¡Hola! Soy tu asistente de voz AI. ¿Cómo puedo ayudarte hoy?";
      }
      
      return {
        content: fallbackMessage,
        tokensUsed: 0,
      };
    }
  }
}

module.exports = new GeminiService();