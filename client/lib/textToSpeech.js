class TextToSpeechService {
  constructor() {
    this.synthesis = null;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this.englishVoice = null;
    this.gujaratiVoice = null;
    this.hindiVoice = null;
    this.spanishVoice = null;
    this.frenchVoice = null;
    this.germanVoice = null;

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

    // Log all voices for debugging
    voices.forEach(voice => {
      console.log(`  - ${voice.name} (${voice.lang})`);
    });

    // Find English female voice
    const preferredVoices = [
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Zira',
      'Samantha',
      'Victoria',
    ];

    for (const prefName of preferredVoices) {
      const voice = voices.find(v => v.name.includes(prefName));
      if (voice) {
        this.englishVoice = voice;
        console.log(`✅ English voice found: ${voice.name}`);
        break;
      }
    }

    // Fallback English voice
    if (!this.englishVoice) {
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        this.englishVoice = englishVoice;
        console.log(`✅ Using fallback English voice: ${englishVoice.name}`);
      }
    }

    // Try to find Gujarati voice - prioritize Google or Natural voices
    const guVoices = voices.filter(v => v.lang.startsWith('gu'));
    const bestGu = guVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || guVoices[0];
    
    if (bestGu) {
      this.gujaratiVoice = bestGu;
      console.log(`✅ Gujarati voice found: ${bestGu.name}`);
    } else {
      console.log('⚠️ No native Gujarati voice found - will use English fallback');
    }

    // Try to find Hindi voice
    const hindiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi');
    if (hindiVoice) {
      this.hindiVoice = hindiVoice;
      console.log(`✅ Hindi voice found: ${hindiVoice.name}`);
    }

    // Try to find Spanish voice
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      this.spanishVoice = spanishVoice;
      console.log(`✅ Spanish voice found: ${spanishVoice.name}`);
    }

    // Try to find French voice
    const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frenchVoice) {
      this.frenchVoice = frenchVoice;
      console.log(`✅ French voice found: ${frenchVoice.name}`);
    }

    // Try to find German voice
    const germanVoice = voices.find(v => v.lang.startsWith('de'));
    if (germanVoice) {
      this.germanVoice = germanVoice;
      console.log(`✅ German voice found: ${germanVoice.name}`);
    }
  }

  detectLanguage(text) {
    const patterns = {
      'gu': /[\u0A80-\u0AFF]/i,  // Gujarati script
      'hi': /[\u0900-\u097F]/i,  // Hindi script
      'es': /[¿¡áéíóúñÑ]/i,
      'fr': /[àâçéèêëîïôûùüÿœ]/i,
      'de': /[äöüß]/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return lang;
    }
    return 'en';
  }

  getVoiceForLanguage(languageCode, detectedLang) {
    // Return appropriate voice based on language
    if (languageCode === 'gu-IN' || detectedLang === 'gu') {
      return this.gujaratiVoice || this.englishVoice;
    }
    if (languageCode === 'hi-IN' || detectedLang === 'hi') {
      return this.hindiVoice || this.englishVoice;
    }
    if (languageCode === 'es-ES' || detectedLang === 'es') {
      return this.spanishVoice || this.englishVoice;
    }
    if (languageCode === 'fr-FR' || detectedLang === 'fr') {
      return this.frenchVoice || this.englishVoice;
    }
    if (languageCode === 'de-DE' || detectedLang === 'de') {
      return this.germanVoice || this.englishVoice;
    }
    return this.englishVoice;
  }

  speak(text, selectedLanguage = 'English', onEndCallback = null) {
    console.log('🔊 speak() called with selected language:', selectedLanguage);
    console.log('🔊 Text:', text?.substring(0, 100));

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

    // Detect language from text
    const detectedLang = this.detectLanguage(text);
    console.log(`🌍 Detected script: ${detectedLang}`);

    // Map selected language to language code
    const languageMap = {
      'English': 'en-US',
      'Gujarati': 'gu-IN',
      'Hindi': 'hi-IN',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'German': 'de-DE'
    };

    const targetLangCode = languageMap[selectedLanguage] || 'en-US';
    console.log(`🎯 Target language code: ${targetLangCode}`);

    // Cancel any ongoing speech
    this.stop();

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);

        // Get the appropriate voice
        const voice = this.getVoiceForLanguage(targetLangCode, detectedLang);
        if (voice) {
          utterance.voice = voice;
          console.log(`🎤 Using voice: ${voice.name} (${voice.lang})`);
        }

        // Set the correct language code
        utterance.lang = targetLangCode;

        // Adjust rate and pitch based on language
        // Adjust rate and pitch for native Gujarati clarity
        if (targetLangCode === 'gu-IN') {
          utterance.rate = 0.8;  // Slightly slower for better phonetics
          utterance.pitch = 1.0; // More natural pitch
        } else if (targetLangCode === 'hi-IN') {
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
        } else {
          utterance.rate = 0.95;
          utterance.pitch = 1.2;
        }

        utterance.volume = 1;

        utterance.onstart = () => {
          console.log(`🔊 Started speaking in ${selectedLanguage}`);
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