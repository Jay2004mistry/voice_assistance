'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SpeechToTextService from '@/lib/speechToText';
import TextToSpeechService from '@/lib/textToSpeech';
import { createSession, sendMessage, getChatHistory, clearChatHistory } from '@/lib/api';

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('🌍 Auto');
  
  const speechToTextRef = useRef(null);
  const textToSpeechRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isProcessingRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null);
  const lastMessageCountRef = useRef(0);

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

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > lastMessageCountRef.current) {
      const newMessagesCount = messages.length - lastMessageCountRef.current;
      setUnreadCount(prev => prev + newMessagesCount);
      setHasNewMessage(true);
      setTimeout(() => setHasNewMessage(false), 1000);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, isOpen]);

  // ========== HANDLE USER INPUT ==========
 const handleUserInput = async (text) => {
  console.log('🔵 handleUserInput called with:', text);
  
  if (isProcessingRef.current) {
    console.log('⏸️ Already processing, skipping');
    return;
  }
  
  if (!sessionId) {
    console.log('❌ No sessionId - waiting for session...');
    setError('Session initializing, please wait...');
    setTimeout(() => setError(null), 2000);
    return;
  }
  
  if (!text || text.trim() === '') {
    console.log('❌ Empty text');
    return;
  }
  
  isProcessingRef.current = true;
  
  // Add user message to UI
  const userMessage = { role: 'user', content: text };
  console.log('📝 Adding user message to UI:', userMessage);
  setMessages(prev => [...prev, userMessage]);
  
  // Stop listening if active
  if (speechToTextRef.current && isListening) {
    speechToTextRef.current.stopListening();
  }
  
  // Stop any ongoing speech
  if (textToSpeechRef.current && isSpeaking) {
    textToSpeechRef.current.stop();
  }
  
  setIsThinking(true);
  
  try {
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    conversationHistory.push(userMessage);
    
    console.log('🔄 Sending to API...');
const response = await sendMessage(sessionId, text, conversationHistory, currentLanguage);    console.log('📦 API Response:', response);
    
    const aiMessage = { role: 'assistant', content: response.message };
    console.log('🤖 Adding AI message to UI:', aiMessage);
    setMessages(prev => [...prev, aiMessage]);
    
    // FIXED: Remove isOpen condition - always speak if chat is open OR if voice mode is active
    // Also check if response.message exists and is not empty
    if (textToSpeechRef.current && response.message && response.message.trim() !== '') {
      console.log('🔊 Speaking response:', response.message.substring(0, 100));
      // Small delay to ensure UI updates first
      setTimeout(() => {
        textToSpeechRef.current.speak(response.message);
      }, 100);
    } else {
      console.log('⚠️ Cannot speak - textToSpeechRef:', !!textToSpeechRef.current, 'message:', !!response.message);
    }
    
    setTextInput('');
    
  } catch (error) {
    console.error('❌ Error:', error);
    setError('Failed to get response');
    setTimeout(() => setError(null), 2000);
    // Remove the failed user message
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
    console.log('🎤 Toggle listening - isListening:', isListening, 'isMicReady:', isMicReady, 'isSessionReady:', isSessionReady);
    
    if (!isSessionReady) {
      setError('Session initializing, please wait...');
      setTimeout(() => setError(null), 1500);
      return;
    }
    
    if (!isMicReady) {
      setError('Mic not available');
      setTimeout(() => setError(null), 1500);
      return;
    }
    
    if (isListening) {
      console.log('Stopping listening...');
      speechToTextRef.current?.stopListening();
      setIsListening(false);
    } else {
      console.log('Starting listening...');
      speechToTextRef.current?.startListening();
      setIsListening(true);
      setInputMode('voice');
      
      // Clear existing timeout
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isListening) {
          console.log('Auto-stop timeout');
          speechToTextRef.current?.stopListening();
          setError('No speech detected');
          setTimeout(() => setError(null), 1500);
        }
      }, 10000);
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    await clearChatHistory(sessionId);
    setMessages([]);
    setError('Chat cleared');
    setTimeout(() => setError(null), 1000);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  // Initialize session and load history
  useEffect(() => {
    const initSession = async () => {
      try {
        let storedSessionId = localStorage.getItem('floatingChatSessionId');
        
        if (!storedSessionId) {
          const session = await createSession();
          storedSessionId = session.sessionId;
          localStorage.setItem('floatingChatSessionId', storedSessionId);
        }
        
        setSessionId(storedSessionId);
        setIsSessionReady(true); // Mark session as ready
        
        const history = await getChatHistory(storedSessionId, 50);
        const formattedMessages = history.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
        setMessages(formattedMessages);
        lastMessageCountRef.current = formattedMessages.length;
        
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Cannot connect to server');
        setTimeout(() => setError(null), 3000);
      }
    };
    
    initSession();
  }, []);

  // Initialize speech services - ONLY AFTER session is ready
  useEffect(() => {
    if (!isSessionReady) {
      console.log('⏳ Waiting for session to be ready before initializing speech...');
      return;
    }
    
    console.log('🎤 Session ready! Initializing speech services...');
    
    const speechToText = new SpeechToTextService();
    const textToSpeech = new TextToSpeechService();
    
    speechToTextRef.current = speechToText;
    textToSpeechRef.current = textToSpeech;
    
    // Set up speech recognition callbacks
    speechToText.onResult = (transcript) => {
      console.log('🎯🎯🎯 SPEECH RECOGNITION RESULT:', transcript);
      
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      
      if (transcript && transcript.trim() !== '') {
        console.log('✅ Calling handleUserInput with:', transcript);
        handleUserInput(transcript);
      } else {
        console.log('⚠️ Empty transcript, ignoring');
      }
      setIsListening(false);
    };
    
    speechToText.onError = (errorMsg) => {
      console.log('❌ Speech error:', errorMsg);
      if (errorMsg === 'no-speech') {
        setError('No speech detected');
        setTimeout(() => setError(null), 1500);
      } else if (errorMsg.includes('microphone') || errorMsg.includes('permission')) {
        setError('Microphone access needed');
        setIsMicReady(false);
        setInputMode('text');
        setTimeout(() => setError(null), 2000);
      } else {
        setError(errorMsg);
        setTimeout(() => setError(null), 2000);
      }
      setIsListening(false);
    };
    
    speechToText.onEnd = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    
    textToSpeech.onStart = () => {
      console.log('🔊 Started speaking');
      setIsSpeaking(true);
    };
    
    textToSpeech.onEnd = () => {
      console.log('🔊 Finished speaking');
      setIsSpeaking(false);
    };
    
    textToSpeech.onError = (errorMsg) => {
      console.error('Speech synthesis error:', errorMsg);
      setIsSpeaking(false);
    };
    
    // Check microphone permission
    const checkMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
        stream.getTracks().forEach(track => track.stop());
        setIsMicReady(true);
      } catch (err) {
        console.error('❌ Microphone access denied:', err);
        setIsMicReady(false);
        setError('Please allow microphone access to use voice input');
        setInputMode('text');
        setTimeout(() => setError(null), 3000);
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      checkMicrophone();
    }
    
    return () => {
      if (speechToTextRef.current) {
        speechToTextRef.current.stopListening();
      }
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
    };
  }, [isSessionReady]); // ← IMPORTANT: This now depends on isSessionReady

  return (
    <>
      {/* Floating Chat Button */}
      <div className="floating-chat-btn" onClick={toggleChat}>
        {isOpen ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="unread-badge animate-bounce">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </>
        )}
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${!isOpen ? 'closed' : ''}`}>
        <div className="chat-phone-frame">
          <div className="chat-phone-screen flex flex-col">
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
            <div className="text-center py-2 border-b border-white/10 flex justify-between items-center px-4">
              <div className="w-8"></div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
               <p className="text-[10px] text-gray-400 mt-0.5">
  {!isSessionReady ? '⏳ Initializing...' : isListening ? '🎤 Listening...' : isSpeaking ? `🔊 Speaking (${currentLanguage})` : `🌍 ${currentLanguage}`}
</p>
              </div>
              <button onClick={clearChat} className="text-gray-400 hover:text-white text-sm">
                🗑️
              </button>
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
                  disabled={!isMicReady || !isSessionReady}
                  className={`flex-1 py-1 rounded-full text-[10px] font-medium transition-all ${
                    inputMode === 'voice' && isMicReady && isSessionReady
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/10 text-gray-400'
                  } ${(!isMicReady || !isSessionReady) ? 'opacity-50' : ''}`}
                >
                  🎤 Speak
                </button>
              </div>
              {/* Language Selector - Add this after Mode Toggle Buttons */}
<div className="flex gap-1 mb-2 justify-center">
  <button
    onClick={() => setCurrentLanguage('Auto')}
    className={`px-2 py-0.5 rounded-full text-[8px] transition-all ${
      currentLanguage === 'Auto' 
        ? 'bg-green-500 text-white' 
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`}
  >
    🌍 Auto
  </button>
  <button
    onClick={() => setCurrentLanguage('English')}
    className={`px-2 py-0.5 rounded-full text-[8px] transition-all ${
      currentLanguage === 'English' 
        ? 'bg-blue-500 text-white' 
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`}
  >
    🇬🇧 EN
  </button>
  <button
    onClick={() => setCurrentLanguage('Hindi')}
    className={`px-2 py-0.5 rounded-full text-[8px] transition-all ${
      currentLanguage === 'Hindi' 
        ? 'bg-orange-500 text-white' 
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`}
  >
    🇮🇳 हिंदी
  </button>
  <button
    onClick={() => setCurrentLanguage('Gujarati')}
    className={`px-2 py-0.5 rounded-full text-[8px] transition-all ${
      currentLanguage === 'Gujarati' 
        ? 'bg-purple-500 text-white' 
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`}
  >
    🇮🇳 ગુજરાતી
  </button>
  <button
    onClick={() => setCurrentLanguage('Spanish')}
    className={`px-2 py-0.5 rounded-full text-[8px] transition-all ${
      currentLanguage === 'Spanish' 
        ? 'bg-red-500 text-white' 
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`}
  >
    🇪🇸 ES
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
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center disabled:opacity-50"
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
                    disabled={!isMicReady || !isSessionReady}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                      isListening ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    } ${(!isMicReady || !isSessionReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      </div>
    </>
  );
}