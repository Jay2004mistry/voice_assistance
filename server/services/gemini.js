const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      console.error('❌ GOOGLE_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Use a confirmed working model
    // Option 1: gemini-2.0-flash-exp (Fast, experimental)
    // Option 2: gemini-1.5-flash-8b (Smaller, reliable)
    // Option 3: gemini-1.5-pro (Higher quality, more limited)
    
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",  // Working model
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });
    
    // Rate limiting variables
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minInterval = 2000; // 2 seconds between requests
    this.maxRetries = 3;
    this.baseDelay = 30000; // 30 seconds base delay for rate limit retry
  }

  async getChatCompletion(messages, preferredLanguage = null) {
    // Queue the request to handle rate limiting
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ messages, preferredLanguage, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    // Enforce minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    const request = this.requestQueue.shift();
    
    try {
      const result = await this.makeRequestWithRetry(
        request.messages, 
        request.preferredLanguage
      );
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
    
    this.lastRequestTime = Date.now();
    this.isProcessing = false;
    this.processQueue();
  }

  async makeRequestWithRetry(messages, preferredLanguage, retryCount = 0) {
    try {
      console.log('🤖 Calling Gemini API...');
      console.log('🌍 Preferred language:', preferredLanguage || 'Auto detect');
      console.log(`📊 Attempt: ${retryCount + 1}/${this.maxRetries + 1}`);
      
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
      4. Be helpful and engaging.
      
      CRITICAL RULE - YOU MUST EXAMINE THE FULL CONVERSATION HISTORY:
      - When answering ANY question about information the user shared, look through the ENTIRE conversation history
      - If the user's name appears ANYWHERE in previous messages, you MUST remember and use it
      - When asked "What is my name?", search the complete message history for their name BEFORE saying you don't know
      - User information shared earlier SHOULD be available to you in this conversation
      - If information was mentioned before in this chat, treat it as known fact`;
      
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
        tokensUsed: response.usageMetadata?.totalTokenCount || 0,
      };
      
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);
      
      // Check if it's a rate limit error (429) or model not found
      const isRateLimit = error.message.includes('429') || 
                          error.message.includes('quota') ||
                          error.message.includes('rate limit');
      
      const isModelError = error.message.includes('not found') || 
                           error.message.includes('404');
      
      if (isModelError && retryCount === 0) {
        // Try alternative model
        console.log('🔄 Model not found, trying alternative...');
        const alternativeModels = ['gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        
        for (const altModel of alternativeModels) {
          try {
            console.log(`🔄 Trying alternative model: ${altModel}`);
            this.model = this.genAI.getGenerativeModel({ 
              model: altModel,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
              },
            });
            return await this.makeRequestWithRetry(messages, preferredLanguage, retryCount + 1);
          } catch (altError) {
            console.log(`❌ Alternative model ${altModel} failed:`, altError.message);
          }
        }
      }
      
      if (isRateLimit && retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`⚠️ Rate limit hit. Waiting ${delay/1000}s before retry ${retryCount + 2}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(messages, preferredLanguage, retryCount + 1);
      }
      
      // Return fallback response
      console.log('⚠️ Using fallback response');
      return this.getFallbackResponse(preferredLanguage);
    }
  }

  getFallbackResponse(preferredLanguage) {
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

  // Method to check if API is available
  async healthCheck() {
    try {
      const testResult = await this.model.generateContent("Say 'OK'");
      const response = await testResult.response;
      return { status: 'healthy', message: response.text() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Method to get current queue length
  getQueueLength() {
    return this.requestQueue.length;
  }
}

module.exports = new GeminiService();




// only vihil infotech
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const companyData = require('./companyKnowledge');
// const intentDetector = require('./intentDetector');

// class GeminiService {
//   constructor() {
//     this.apiKey = process.env.GOOGLE_API_KEY;
//     if (!this.apiKey) {
//       console.error('❌ GOOGLE_API_KEY not found');
//     }
//     this.genAI = new GoogleGenerativeAI(this.apiKey);
//     this.model = this.genAI.getGenerativeModel({ 
//       model: "gemini-2.5-flash",
//       generationConfig: {
//         temperature: 0.3, // Lower temperature for more consistent responses
//         maxOutputTokens: 500,
//       },
//     });
//   }

//   async getChatCompletion(messages, preferredLanguage = 'English') {
//     try {
//       // Get the last user message
//       const userMessage = messages[messages.length - 1].content;
      
//       // Detect intent
//       const detection = intentDetector.isCompanyRelated(userMessage);
//       console.log('🔍 Intent detection:', detection);
      
//       // If not company-related, return immediate response without API call
//       if (!detection.allowed) {
//         console.log('🚫 Blocked: User asked off-topic question');
//         const response = intentDetector.getSmartResponse(userMessage, detection, preferredLanguage);
//         return {
//           content: response,
//           tokensUsed: 0,
//           blocked: true
//         };
//       }
      
//       console.log('✅ Allowed: Company-related question');
      
//       // Build comprehensive system instruction with ALL company data
//       const systemInstruction = this.buildSystemInstruction(preferredLanguage);
      
//       // Build conversation with context
//       let conversationHistory = `${systemInstruction}\n\n`;
//       conversationHistory += `Current conversation:\n`;
      
//       for (const msg of messages) {
//         const role = msg.role === 'user' ? 'Customer' : 'Vihil InfoTech Support';
//         conversationHistory += `${role}: ${msg.content}\n`;
//       }
      
//       conversationHistory += `Vihil InfoTech Support: `;
      
//       const result = await this.model.generateContent(conversationHistory);
//       const response = await result.response;
//       let text = response.text();
      
//       // Post-process to ensure response is on-topic
//       text = this.ensureOnTopic(text, userMessage);
      
//       console.log('✅ Response generated');
//       return {
//         content: text,
//         tokensUsed: await response.usageMetadata?.totalTokenCount || 0,
//       };
      
//     } catch (error) {
//       console.error('❌ Error:', error.message);
//       return {
//         content: this.getFallbackResponse(preferredLanguage),
//         tokensUsed: 0,
//       };
//     }
//   }

//   buildSystemInstruction(preferredLanguage) {
//     const servicesList = Object.values(companyData.services).map(s => 
//       `   • ${s.name}: ${s.description}`
//     ).join('\n');
    
//     const featuresList = Object.values(companyData.services).flatMap(s => 
//       s.features.map(f => `   • ${f}`)
//     ).slice(0, 30).join('\n');
    
//     const industriesList = companyData.industries.map(i => `   • ${i}`).join('\n');
    
//     const statsList = Object.entries(companyData.stats).map(([key, value]) => 
//       `   • ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${value}`
//     ).join('\n');
    
//     const methodologyList = companyData.methodology.practices.map(p => 
//       `   • ${p}`
//     ).join('\n');
    
//     return `You are an AI customer support assistant for **Vhil InfoTech** (vihilinfotech.com). 
// You represent the company and MUST ONLY answer questions about Vhil InfoTech.

// ## COMPLETE COMPANY KNOWLEDGE BASE:

// ### COMPANY OVERVIEW:
// - Name: ${companyData.company.name}
// - Tagline: "${companyData.company.tagline}"
// - Mission: ${companyData.company.mission}
// - Values: ${companyData.company.values.join(', ')}
// - Description: ${companyData.company.description}

// ### ALL SERVICES OFFERED:
// ${servicesList}

// ### KEY FEATURES & CAPABILITIES:
// ${featuresList}

// ### INDUSTRIES WE SERVE:
// ${industriesList}

// ### COMPANY STATISTICS:
// ${statsList}

// ### DEVELOPMENT METHODOLOGY:
// ${methodologyList}

// ### TECHNOLOGIES:
// ${companyData.keywords.technologies.join(', ')}

// ### CONTACT INFO:
// - Website: ${companyData.contact.website}
// - Email: ${companyData.contact.email}
// - Phone: ${companyData.contact.phone}

// ## ABSOLUTE RULES:

// 1. **ONLY answer questions about:**
//    - Vhil InfoTech's services (web, mobile, software development)
//    - Pricing, timelines, and project inquiries
//    - Technologies we use
//    - Company statistics and achievements
//    - Industries we serve
//    - Development methodology and quality practices

// 2. **NEVER answer questions about:**
//    - Weather, news, politics, sports
//    - Movies, music, entertainment
//    - Jokes, humor, or fun facts
//    - Other companies or competitors
//    - Personal advice or relationships
//    - General knowledge or history

// 3. **If asked off-topic questions, respond with:**
//    "I specialize in Vhil InfoTech's technology services. How can I help you with web development, mobile apps, or digital marketing today?"

// 4. **Be professional, helpful, and enthusiastic about our services.**
// 5. **Keep responses concise (2-4 sentences) for voice output.**
// 6. ${preferredLanguage !== 'Auto' ? `Respond ONLY in ${preferredLanguage} language.` : 'Detect user language and respond in same language.'}

// Remember: You are representing Vhil InfoTech. Stay on-brand and on-topic 100% of the time.`;
//   }

//   ensureOnTopic(response, userQuestion) {
//     // Check if response is trying to answer off-topic questions
//     const offTopicIndicators = ['weather', 'temperature', 'movie', 'song', 'game', 'sports', 'cricket', 'joke', 'funny', 'news', 'politics'];
    
//     for (const indicator of offTopicIndicators) {
//       if (response.toLowerCase().includes(indicator) && !userQuestion.toLowerCase().includes(indicator)) {
//         console.log('⚠️ Off-topic response detected, correcting...');
//         return "I apologize, but I can only assist with questions about Vhil InfoTech's services. How can I help you with web development, mobile apps, or digital marketing today?";
//       }
//     }
    
//     return response;
//   }

//   getFallbackResponse(preferredLanguage) {
//     const fallbacks = {
//       'English': `Thank you for reaching out to Vhil InfoTech! I'm here to help with our technology services. Please visit our website ${companyData.contact.website} or email us at ${companyData.contact.email} for assistance. How can I help with your project today?`,
//       'Hindi': `Vhil InfoTech से संपर्क करने के लिए धन्यवाद! मैं हमारी तकनीकी सेवाओं में मदद करने के लिए यहाँ हूँ। कृपया हमारी वेबसाइट ${companyData.contact.website} पर जाएँ या सहायता के लिए हमें ${companyData.contact.email} पर ईमेल करें। मैं आपके प्रोजेक्ट में कैसे मदद कर सकता हूँ?`,
//       'Gujarati': `Vhil InfoTech નો સંપર્ક કરવા બદલ આભાર! હું અમારી ટેકનોલોજી સેવાઓમાં મદદ કરવા માટે અહીં છું. કૃપા કરીને અમારી વેબસાઇટ ${companyData.contact.website} ની મુલાકાત લો અથવા સહાય માટે અમને ${companyData.contact.email} પર ઇમેઇલ કરો. હું તમારા પ્રોજેક્ટમાં કેવી રીતે મદદ કરી શકું?`,
//     };
//     return fallbacks[preferredLanguage] || fallbacks['English'];
//   }
// }

// module.exports = new GeminiService();