const companyData = require('./companyKnowledge');

class IntentDetector {
  constructor() {
    this.companyKeywords = this.buildKeywordSet();
    this.allowedTopics = this.buildAllowedTopics();
    this.blockedTopics = this.buildBlockedTopics();
  }

  buildKeywordSet() {
    const keywords = new Set();
    
    // Add company name variations
    keywords.add('vihil');
    keywords.add('vihil infotech');
    keywords.add('infotech');
    keywords.add('your company');
    
    // Add service keywords
    companyData.keywords.services.forEach(k => keywords.add(k.toLowerCase()));
    companyData.keywords.technologies.forEach(k => keywords.add(k.toLowerCase()));
    companyData.keywords.business.forEach(k => keywords.add(k.toLowerCase()));
    
    // Add all service names
    Object.values(companyData.services).forEach(service => {
      keywords.add(service.name.toLowerCase());
      service.features.forEach(f => {
        // Add meaningful words from features
        f.toLowerCase().split(' ').forEach(word => {
          if (word.length > 3) keywords.add(word);
        });
      });
    });
    
    // Add industry names
    companyData.industries.forEach(i => keywords.add(i.toLowerCase()));
    
    // Add methodology terms
    companyData.methodology.practices.forEach(p => {
      p.toLowerCase().split(' ').forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    });
    
    return keywords;
  }

  buildAllowedTopics() {
    return [
      // Company information
      'company', 'vihil', 'infotech', 'about', 'mission', 'vision', 'values', 'history',
      
      // Services
      'service', 'web', 'app', 'mobile', 'software', 'development', 'digital', 'marketing',
      'seo', 'security', 'cyber', 'big data', 'analytics', 'desktop', 'application',
      'cross platform', 'iot', 'robotics', 'consulting', 'solution',
      
      // Business inquiries
      'price', 'cost', 'quote', 'estimate', 'budget', 'timeline', 'delivery', 'deadline',
      'hire', 'outsource', 'partner', 'collaborate', 'project',
      
      // Technologies
      'technology', 'tech', 'framework', 'database', 'react', 'node', 'python', 'flutter',
      'angular', 'vue', 'laravel', 'django', 'mongodb', 'sql', 'cloud',
      
      // Quality
      'quality', 'testing', 'qa', 'agile', 'scrum', 'kanban', 'methodology', 'process',
      
      // Support
      'support', 'maintenance', 'help', 'assistance', 'contact', 'email', 'phone',
      
      // Results
      'client', 'project', 'success', 'result', 'portfolio', 'case study', 'rating', 'review'
    ];
  }

  buildBlockedTopics() {
    return [
      // General knowledge
      'weather', 'temperature', 'rain', 'climate',
      'news', 'current events', 'politics', 'election',
      'history', 'geography', 'capital', 'country',
      
      // Entertainment
      'movie', 'film', 'cinema', 'actor', 'actress', 'celebrity',
      'song', 'music', 'album', 'concert',
      'game', 'sports', 'cricket', 'football', 'score', 'match',
      'joke', 'funny', 'humor', 'meme',
      
      // Personal
      'relationship', 'dating', 'marriage', 'love',
      'health', 'fitness', 'diet', 'exercise', 'workout',
      'recipe', 'cooking', 'food', 'restaurant',
      'travel', 'vacation', 'hotel', 'flight',
      
      // Other business (not Vihil)
      'competitor', 'other company', 'different company',
      'amazon', 'google', 'microsoft', 'apple', 'facebook', 'instagram',
      
      // Irrelevant
      'horoscope', 'astrology', 'fortune', 'luck',
      'philosophy', 'religion', 'spirituality'
    ];
  }

  isCompanyRelated(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Check for company name first (strongest signal)
    if (message.includes('vihil') || message.includes('vihil infotech')) {
      return { allowed: true, confidence: 1.0, reason: "Contains company name" };
    }
    
    // Check for blocked topics first
    for (const topic of this.blockedTopics) {
      if (message.includes(topic)) {
        return { 
          allowed: false, 
          confidence: 0.95, 
          reason: `Contains blocked topic: ${topic}`,
          alternativeMessage: "I specialize in Vihil InfoTech's technology services. How can I help you with web development, mobile apps, or digital marketing today?"
        };
      }
    }
    
    // Count keyword matches
    let matches = 0;
    for (const keyword of this.companyKeywords) {
      if (message.includes(keyword)) {
        matches++;
      }
    }
    
    // Also check allowed topics
    for (const topic of this.allowedTopics) {
      if (message.includes(topic)) {
        matches++;
      }
    }
    
    // Calculate confidence
    const confidence = Math.min(matches / 5, 1.0);
    
    if (confidence > 0.2 || matches >= 2) {
      return { 
        allowed: true, 
        confidence: confidence, 
        reason: `${matches} relevant keywords matched`,
        matches: matches
      };
    }
    
    return { 
      allowed: false, 
      confidence: confidence, 
      reason: `Only ${matches} relevant keywords found. Needs 2+ for company-related questions.`,
      alternativeMessage: "I'm your Vihil InfoTech assistant. I can help with our software development, web applications, mobile apps, SEO, digital marketing, cybersecurity, and more. What technology solution can I help you with today?"
    };
  }

  getSmartResponse(userMessage, detectionResult, preferredLanguage = 'English') {
    const responses = {
      English: {
        general: `I'm sorry, I can only assist with questions about **Vihil InfoTech** and our technology services. 

**What I CAN help with:**
• Web & Mobile App Development
• SEO & Digital Marketing
• Cybersecurity & Big Data
• IoT, Robotics & Desktop Apps
• Pricing, timelines, and project inquiries

**What I CANNOT help with:**
• General knowledge, news, weather
• Entertainment, sports, or jokes
• Personal advice or unrelated topics

How can I help you with Vihil InfoTech's services today?`,

        specific: `I'm here to help with Vihil InfoTech's services specifically. Could you please ask me about:
• Our web or mobile development services
• SEO, digital marketing, or cybersecurity
• Big data analytics or desktop applications
• Project pricing or timelines

What technology solution are you interested in?`
      },
      
      Hindi: {
        general: `मुझे क्षमा करें, मैं केवल **Vihil InfoTech** और हमारी तकनीकी सेवाओं के बारे में प्रश्नों में सहायता कर सकता हूँ।

**मैं किसमें मदद कर सकता हूँ:**
• वेब और मोबाइल ऐप विकास
• SEO और डिजिटल मार्केटिंग
• साइबर सुरक्षा और बिग डेटा
• IoT, रोबोटिक्स और डेस्कटॉप ऐप्स
• मूल्य निर्धारण, समयसीमा और परियोजना पूछताछ

**मैं किसमें मदद नहीं कर सकता:**
• सामान्य ज्ञान, समाचार, मौसम
• मनोरंजन, खेल या चुटकुले
• व्यक्तिगत सलाह या असंबंधित विषय

मैं Vihil InfoTech की सेवाओं के बारे में आपकी कैसे मदद कर सकता हूँ?`
      },
      
      Gujarati: {
        general: `મને માફ કરશો, હું ફક્ત **Vihil InfoTech** અને અમારી ટેકનોલોજી સેવાઓ વિશેના પ્રશ્નોમાં સહાય કરી શકું છું.

**હું શેમાં મદદ કરી શકું છું:**
• વેબ અને મોબાઇલ એપ વિકાસ
• SEO અને ડિજિટલ માર્કેટિંગ
• સાયબર સુરક્ષા અને બિગ ડેટા
• IoT, રોબોટિક્સ અને ડેસ્કટોપ એપ્સ
• કિંમત, સમયરેખા અને પ્રોજેક્ટ પૂછપરછ

**હું શેમાં મદદ કરી શકતો નથી:**
• સામાન્ય જ્ઞાન, સમાચાર, હવામાન
• મનોરંજન, રમતો અથવા ટુચકાઓ
• વ્યક્તિગત સલાહ અથવા સંબંધિત વિષયો

હું Vihil InfoTech ની સેવાઓ વિશે તમારી કેવી રીતે મદદ કરી શકું?`
      }
    };

    return responses[preferredLanguage]?.general || responses['English'].general;
  }
}

module.exports = new IntentDetector();