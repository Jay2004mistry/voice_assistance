class TextToSpeechService {
  constructor() {
    this.synthesis = null;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this.consistentVoice = null;
    
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
    console.log('🎤 Available voices:', voices.length);
    
    // Find a consistent English female voice to use for ALL languages
    const preferredVoices = [
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Zira',
      'Samantha',
      'Victoria',
      'Karen',
    ];

    // Try to find a preferred female voice
    for (const prefName of preferredVoices) {
      const voice = voices.find(v => v.name.includes(prefName));
      if (voice) {
        this.consistentVoice = voice;
        console.log(`✅ Using consistent voice for ALL languages: ${voice.name}`);
        return;
      }
    }

    // Fallback: any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.consistentVoice = englishVoice;
      console.log(`✅ Using fallback English voice for ALL languages: ${englishVoice.name}`);
      return;
    }

    // Last resort: any voice
    if (voices.length > 0) {
      this.consistentVoice = voices[0];
      console.log(`⚠️ Using default voice for ALL languages: ${voices[0].name}`);
    }
  }

  // Still detect language for logging, but always use same voice
  detectLanguage(text) {
    const patterns = {
      'hi': /[\u0900-\u097F]/i,
      'gu': /[\u0A80-\u0AFF]/i,
      'es': /[¿¡áéíóúñÑ]/i,
      'fr': /[àâçéèêëîïôûùüÿœ]/i,
      'de': /[äöüß]/i,
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return lang;
    }
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

    // Detect language (just for logging)
    const detectedLang = this.detectLanguage(text);
    console.log(`🌍 Detected language: ${detectedLang} (using same English voice)`);

    // Cancel any ongoing speech
    this.stop();

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // FORCE: Use the SAME English voice for EVERYTHING
        if (this.consistentVoice) {
          utterance.voice = this.consistentVoice;
          console.log(`🎤 Using consistent voice: ${this.consistentVoice.name}`);
        }
        
        // FORCE: Always use English language settings
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.2;  // Female voice pitch
        utterance.volume = 1;

        utterance.onstart = () => {
          console.log('🔊 Started speaking');
          this.isSpeaking = true;
          this.currentUtterance = utterance;
          if (this.onStart) this.onStart();
        };

        utterance.onend = () => {
          console.log('🔊 Finished speaking');
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