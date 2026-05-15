class SpeechToTextService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.finalTranscript = '';
    this.explicitlyStopped = false;
    this.currentInterimTranscript = '';
    this.silenceTimeout = null;
    this.silenceDelay = 2000;

    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          this.isListening = true;
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            this.finalTranscript += (this.finalTranscript ? ' ' : '') + finalTranscript.trim();
            console.log('✅ Appended final segment:', finalTranscript);
          }
          this.currentInterimTranscript = interimTranscript;
          
          this.resetSilenceTimer();
        };

        this.recognition.onerror = (event) => {
          console.error('🎤 Speech recognition error:', event.error);
          if (event.error === 'no-speech') return;
          this.isListening = false;
          if (this.onError) this.onError(event.error);
        };

        this.recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
          }

          if (!this.explicitlyStopped && this.isListening) {
            console.log('🔄 Auto-restarting...');
            try {
              if (this.recognition && this.isListening) {
                this.recognition.start();
              }
              return;
            } catch (error) {
              console.error('Failed to auto-restart:', error);
            }
          }

          let fullTranscript = this.finalTranscript;
          if (this.currentInterimTranscript && this.currentInterimTranscript.trim() !== '') {
            fullTranscript += (fullTranscript ? ' ' : '') + this.currentInterimTranscript.trim();
          }

          this.isListening = false;

          if (fullTranscript && fullTranscript.trim() !== '') {
            console.log('📤 Sending to onResult:', fullTranscript);
            if (this.onResult) {
              this.onResult(fullTranscript);
            }
          }

          if (this.onEnd) {
            this.onEnd();
          }
        };
      }
    }
  }

  resetSilenceTimer() {
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
    this.silenceTimeout = setTimeout(() => {
      console.log('🔇 Silence detected - finalizing');
      let transcript = (this.finalTranscript + ' ' + this.currentInterimTranscript).trim();
      if (transcript) {
        if (this.onResult) this.onResult(transcript);
        this.finalTranscript = '';
        this.currentInterimTranscript = '';
        this.stopListening();
      }
    }, this.silenceDelay);
  }

  startListening(languageName = 'Auto') {
    if (!this.recognition) return;
    
    const langMap = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Gujarati': 'gu-IN',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'German': 'de-DE'
    };

    const targetLang = langMap[languageName] || 'en-US';
    console.log('🎤 Starting listening in:', targetLang);
    this.recognition.lang = targetLang;
    
    this.finalTranscript = '';
    this.currentInterimTranscript = '';
    this.explicitlyStopped = false;
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) { console.error(e); }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      console.log('🎤 Stop listening called');
      this.explicitlyStopped = true;
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported() {
    return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

export default SpeechToTextService;