'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SpeechToTextService from '@/lib/speechToText';
import TextToSpeechService from '@/lib/textToSpeech';
import { createSession, sendMessage, getChatHistory, clearChatHistory } from '@/lib/api';

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isMicReady, setIsMicReady] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [currentTime, setCurrentTime] = useState('');
  
  const speechToTextRef = useRef(null);
  const textToSpeechRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isProcessingRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Update time for status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(time);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize session and load history
  useEffect(() => {
    const initSession = async () => {
      try {
        let storedSessionId = localStorage.getItem('voiceAssistantSessionId');
        
        if (!storedSessionId) {
          const session = await createSession();
          storedSessionId = session.sessionId;
          localStorage.setItem('voiceAssistantSessionId', storedSessionId);
        }
        
        setSessionId(storedSessionId);
        
        const history = await getChatHistory(storedSessionId, 50);
        const formattedMessages = history.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
        setMessages(formattedMessages);
        
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Cannot connect to server');
        setTimeout(() => setError(null), 3000);
      }
    };
    
    initSession();
  }, []);

  // Initialize speech services
  useEffect(() => {
    const speechToText = new SpeechToTextService();
    const textToSpeech = new TextToSpeechService();
    
    speechToTextRef.current = speechToText;
    textToSpeechRef.current = textToSpeech;
    
    speechToText.onResult = (transcript) => {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      handleUserInput(transcript);
    };
    
    speechToText.onError = (errorMsg) => {
      if (errorMsg === 'no-speech') {
        setError('No speech detected');
        setTimeout(() => setError(null), 1500);
        setIsListening(false);
      } else if (errorMsg.includes('microphone') || errorMsg.includes('permission')) {
        setError('Microphone access needed');
        setIsMicReady(false);
        setInputMode('text');
        setTimeout(() => setError(null), 2000);
      }
    };
    
    speechToText.onEnd = () => {
      setIsListening(false);
    };
    
    textToSpeech.onStart = () => {
      setIsSpeaking(true);
    };
    
    textToSpeech.onEnd = () => {
      setIsSpeaking(false);
    };
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          setIsMicReady(true);
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          setIsMicReady(false);
          setInputMode('text');
        });
    }
    
    return () => {
      if (speechToTextRef.current) {
        speechToTextRef.current.stopListening();
      }
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
    };
  }, []);

  const handleUserInput = async (text) => {
    if (isProcessingRef.current || !sessionId) return;
    if (!text || text.trim() === '') return;
    
    isProcessingRef.current = true;
    
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    
    if (speechToTextRef.current && isListening) {
      speechToTextRef.current.stopListening();
    }
    
    if (textToSpeechRef.current && isSpeaking) {
      textToSpeechRef.current.stop();
    }
    
    setIsThinking(true);
    
    try {
      const conversationHistory = messagesRef.current.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      conversationHistory.push(userMessage);
      
      const response = await sendMessage(sessionId, text, conversationHistory);
      
      const aiMessage = { role: 'assistant', content: response.message };
      setMessages(prev => [...prev, aiMessage]);
      
      if (textToSpeechRef.current && isMicReady) {
        textToSpeechRef.current.speak(response.message);
      }
      
      setTextInput('');
      
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get response');
      setTimeout(() => setError(null), 2000);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
      isProcessingRef.current = false;
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleUserInput(textInput.trim());
    }
  };

  const toggleListening = () => {
    if (!isMicReady) {
      setError('Mic not available');
      setTimeout(() => setError(null), 1500);
      return;
    }
    
    if (isListening) {
      speechToTextRef.current?.stopListening();
      setIsListening(false);
    } else {
      speechToTextRef.current?.startListening();
      setIsListening(true);
      setInputMode('voice');
      
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isListening) {
          speechToTextRef.current?.stopListening();
          setError('No speech detected');
          setTimeout(() => setError(null), 1500);
        }
      }, 8000);
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    await clearChatHistory(sessionId);
    setMessages([]);
    setError('Chat cleared');
    setTimeout(() => setError(null), 1000);
  };

  return (
    <div className="phone-frame">
      <div className="phone-screen flex flex-col">
        {/* Status Bar */}
        <div className="status-bar">
          <span className="font-semibold">{currentTime}</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center py-2 border-b border-white/10">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Assistant
          </h1>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking...' : 'Online'}
          </p>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 mb-2 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs">Start a conversation</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Type or speak to begin</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`${message.role === 'user' ? 'message-user' : 'message-ai'} max-w-[85%]`}>
                  <p className="text-xs leading-relaxed break-words">{message.content}</p>
                  <p className="text-[9px] opacity-50 mt-1">
                    {message.role === 'user' ? 'You' : 'AI'} • just now
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="message-ai max-w-[85%]">
                <div className="typing-indicator">
                  <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-[10px] text-gray-400 ml-1.5">AI is thinking</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Error Toast */}
        {error && (
          <div className="mx-3 mb-1.5 p-1.5 bg-red-500/80 backdrop-blur-sm rounded-xl text-white text-[10px] text-center animate-fade-in">
            {error}
          </div>
        )}
        
        {/* Input Area */}
        <div className="p-2.5 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          {/* Mode Toggle Buttons */}
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 py-1 rounded-full text-[10px] font-medium transition-all ${
                inputMode === 'text' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              ✏️ Type
            </button>
            <button
              onClick={() => setInputMode('voice')}
              disabled={!isMicReady}
              className={`flex-1 py-1 rounded-full text-[10px] font-medium transition-all ${
                inputMode === 'voice' && isMicReady
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-gray-400'
              } ${!isMicReady ? 'opacity-50' : ''}`}
            >
              🎤 Speak
            </button>
            <button
              onClick={clearChat}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
            >
              🗑️
            </button>
          </div>
          
          {/* Text Input */}
          {inputMode === 'text' && (
            <form onSubmit={handleTextSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/10 rounded-full px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={isThinking}
              />
             <button
  type="submit"
  disabled={!textInput.trim() || isThinking}
  className="w-8 h-8 rounded-full bg-gradient-to-r from-vihil-primary to-vihil-secondary flex items-center justify-center disabled:opacity-50 hover:shadow-lg hover:shadow-vihil-primary/50 transition-all"
>
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
</button>
            </form>
          )}
          
          {/* Voice Input */}
          {inputMode === 'voice' && (
            <div className="flex justify-center py-1.5">
              <button
                onClick={toggleListening}
                disabled={!isMicReady}
                className={`mic-button-mobile ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isListening ? (
                    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-3 0h6m-6-7a3 3 0 01-3-3V5a3 3 0 116 0v10a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Home Indicator */}
        <div className="home-indicator"></div>
      </div>
    </div>
  );
}