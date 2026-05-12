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
    
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          this.isListening = true;
          this.finalTranscript = '';
        };
        
        this.recognition.onresult = (event) => {
          console.log('🎤 Result received, event.results length:', event.results.length);
          
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              console.log('✅ Final transcript:', finalTranscript);
            } else {
              interimTranscript += transcript;
              console.log('📝 Interim transcript:', interimTranscript);
            }
          }
          
          // Store final transcript
          if (finalTranscript) {
            this.finalTranscript = finalTranscript;
          }
        };
        
        this.recognition.onerror = (event) => {
          console.error('🎤 Speech recognition error:', event.error);
          this.isListening = false;
          if (this.onError) {
            this.onError(event.error);
          }
        };
        
        this.recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          console.log('📝 Final transcript when ended:', this.finalTranscript);
          
          this.isListening = false;
          
          // IMPORTANT: Send the final transcript when recognition ends
          if (this.finalTranscript && this.finalTranscript.trim() !== '') {
            console.log('📤 Sending to onResult:', this.finalTranscript);
            if (this.onResult) {
              this.onResult(this.finalTranscript);
            }
          } else {
            console.log('⚠️ No final transcript to send');
            if (this.onError) {
              this.onError('no-speech');
            }
          }
          
          if (this.onEnd) {
            this.onEnd();
          }
        };
        
        console.log('✅ Speech recognition initialized');
      } else {
        console.error('❌ Speech recognition not supported');
      }
    }
  }

  startListening() {
    if (!this.recognition) {
      console.error('No recognition object');
      return;
    }
    
    if (this.isListening) {
      console.log('Already listening, stopping first...');
      this.stopListening();
      setTimeout(() => this.startListening(), 100);
      return;
    }
    
    try {
      console.log('🎤 Starting speech recognition...');
      this.finalTranscript = '';
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start:', error);
      this.isListening = false;
      if (this.onError) {
        this.onError(error.message);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        console.log('Stopping speech recognition...');
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping:', error);
      }
      this.isListening = false;
    }
  }

  isSupported() {
    return typeof window !== 'undefined' && 
           (window.SpeechRecognition || window.webkitSpeechRecognition) !== undefined;
  }
}

export default SpeechToTextService;