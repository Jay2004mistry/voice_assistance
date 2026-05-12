class TextToSpeechService {
  constructor() {
    this.synthesis = null;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this.voicesCache = {};
    this.languageVoices = {};
    
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      if (this.synthesis) {
        this.loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  loadVoices() {
    const voices = this.synthesis.getVoices();
    console.log('🎤 Available voices for speech:', voices.length);
    
    // Cache voices by language
    voices.forEach(voice => {
      const lang = voice.lang.split('-')[0];
      if (!this.voicesCache[lang]) {
        this.voicesCache[lang] = [];
      }
      this.voicesCache[lang].push(voice);
    });
    
    // Map language codes to voice preferences
    this.languageVoices = {
      'en': this.findBestVoice(['en'], ['Google UK English Female', 'Google US English Female', 'Microsoft Zira', 'Samantha']),
      'hi': this.findBestVoice(['hi', 'hi-IN'], ['Google हिन्दी', 'Microsoft Heera', 'Lekha']),
      'gu': this.findBestVoice(['gu'], []),
      'es': this.findBestVoice(['es', 'es-ES'], ['Google español', 'Microsoft Sabina', 'Mónica']),
      'fr': this.findBestVoice(['fr', 'fr-FR'], ['Google français', 'Microsoft Hortense']),
      'de': this.findBestVoice(['de', 'de-DE'], ['Google Deutsch', 'Microsoft Katja']),
      'it': this.findBestVoice(['it', 'it-IT'], ['Google italiano', 'Microsoft Elsa']),
      'pt': this.findBestVoice(['pt', 'pt-PT'], ['Google português', 'Microsoft Maria']),
      'ja': this.findBestVoice(['ja', 'ja-JP'], ['Google 日本語', 'Microsoft Haruka']),
      'ko': this.findBestVoice(['ko', 'ko-KR'], ['Google 한국어', 'Microsoft SunHi']),
      'zh': this.findBestVoice(['zh', 'zh-CN'], ['Google 普通话', 'Microsoft Xiaoxiao']),
      'ru': this.findBestVoice(['ru', 'ru-RU'], ['Google русский', 'Microsoft Irina']),
      'ar': this.findBestVoice(['ar', 'ar-SA'], ['Google العربية', 'Microsoft Zeina']),
    };
    
    console.log('🌍 Languages supported:', Object.keys(this.languageVoices).filter(l => this.languageVoices[l]));
  }

  findBestVoice(langs, preferredNames) {
    for (const lang of langs) {
      const voices = this.voicesCache[lang] || [];
      
      // Try preferred voices first
      for (const pref of preferredNames) {
        const voice = voices.find(v => v.name.includes(pref));
        if (voice) return voice;
      }
      
      // Fallback to any voice in that language
      if (voices.length > 0) return voices[0];
    }
    return null;
  }

  detectLanguage(text) {
    // Language detection patterns
    const patterns = {
      'hi': /[\u0900-\u097F]/i,           // Hindi Devanagari
      'gu': /[\u0A80-\u0AFF]/i,           // Gujarati
      'pa': /[\u0A00-\u0A7F]/i,           // Punjabi
      'bn': /[\u0980-\u09FF]/i,           // Bengali
      'ta': /[\u0B80-\u0BFF]/i,           // Tamil
      'te': /[\u0C00-\u0C7F]/i,           // Telugu
      'kn': /[\u0C80-\u0CFF]/i,           // Kannada
      'ml': /[\u0D00-\u0D7F]/i,           // Malayalam
      'es': /[¿¡áéíóúñÑ]/i,               // Spanish
      'fr': /[àâçéèêëîïôûùüÿœ]/i,         // French
      'de': /[äöüß]/i,                    // German
      'it': /[àèéìíîòóùú]/i,              // Italian
      'pt': /[ãõáéíóúâêôç]/i,             // Portuguese
      'ru': /[\u0400-\u04FF]/i,           // Russian
      'ar': /[\u0600-\u06FF]/i,           // Arabic
      'ja': /[\u3040-\u309F\u30A0-\u30FF]/i, // Japanese
      'ko': /[\uAC00-\uD7AF]/i,           // Korean
      'zh': /[\u4E00-\u9FFF]/i,           // Chinese
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return lang;
    }
    
    // Default to English for Latin script
    return 'en';
  }

  speak(text, onEndCallback = null) {
    console.log('🔊 speak() called with text:', text?.substring(0, 100));
    
    if (!this.synthesis) {
      console.error('❌ Speech synthesis not supported');
      if (onEndCallback) onEndCallback();
      return;
    }
    
    if (!text || text.trim() === '') {
      console.log('⚠️ Empty text, nothing to speak');
      if (onEndCallback) onEndCallback();
      return;
    }

    // Detect language
    const detectedLang = this.detectLanguage(text);
    console.log(`🌍 Detected language: ${detectedLang}`);

    // Cancel any ongoing speech
    this.stop();

    // Small delay to ensure clean start
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Get appropriate voice for detected language
        const voice = this.languageVoices[detectedLang];
        if (voice) {
          utterance.voice = voice;
          console.log(`🎤 Using voice for ${detectedLang}: ${voice.name}`);
        }
        
        // Language-specific settings
        const settings = {
          'en': { lang: 'en-US', rate: 0.95, pitch: 1.2 },
          'hi': { lang: 'hi-IN', rate: 0.9, pitch: 1.1 },
          'gu': { lang: 'gu-IN', rate: 0.85, pitch: 1.0 },
          'es': { lang: 'es-ES', rate: 0.9, pitch: 1.2 },
          'fr': { lang: 'fr-FR', rate: 0.9, pitch: 1.1 },
          'de': { lang: 'de-DE', rate: 0.9, pitch: 1.1 },
          'it': { lang: 'it-IT', rate: 0.9, pitch: 1.1 },
          'pt': { lang: 'pt-PT', rate: 0.9, pitch: 1.1 },
          'ja': { lang: 'ja-JP', rate: 0.9, pitch: 1.0 },
          'ko': { lang: 'ko-KR', rate: 0.9, pitch: 1.0 },
          'zh': { lang: 'zh-CN', rate: 0.9, pitch: 1.0 },
          'ru': { lang: 'ru-RU', rate: 0.9, pitch: 1.0 },
          'ar': { lang: 'ar-SA', rate: 0.9, pitch: 1.0 },
        };
        
        const langSettings = settings[detectedLang] || settings['en'];
        utterance.lang = langSettings.lang;
        utterance.rate = langSettings.rate;
        utterance.pitch = langSettings.pitch;
        utterance.volume = 1;

        utterance.onstart = () => {
          console.log(`🔊 Speech started in ${detectedLang}`);
          this.isSpeaking = true;
          this.currentUtterance = utterance;
          if (this.onStart) this.onStart();
        };

        utterance.onend = () => {
          console.log(`🔊 Speech ended in ${detectedLang}`);
          this.isSpeaking = false;
          this.currentUtterance = null;
          if (this.onEnd) this.onEnd();
          if (onEndCallback) onEndCallback();
        };

        utterance.onerror = (event) => {
          console.error('❌ Speech error:', event.error);
          this.isSpeaking = false;
          this.currentUtterance = null;
          if (this.onError) this.onError(event.error);
          if (onEndCallback) onEndCallback();
        };

        this.synthesis.speak(utterance);
      } catch (error) {
        console.error('❌ Error creating utterance:', error);
        if (onEndCallback) onEndCallback();
      }
    }, 50);
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  isSupported() {
    return typeof window !== 'undefined' && window.speechSynthesis !== undefined;
  }
  
  getAvailableVoices() {
    return this.synthesis?.getVoices() || [];
  }
}

export default TextToSpeechService;