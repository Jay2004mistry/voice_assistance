export default function MicButton({ isListening, isSpeaking, isThinking, isMicReady = true, onClick }) {
  const getButtonState = () => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    if (isThinking) return 'thinking';
    return 'idle';
  };
  
  const state = getButtonState();
  
  const getButtonStyles = () => {
    if (!isMicReady) return 'bg-gray-500/50 cursor-not-allowed';
    
    switch (state) {
      case 'listening':
        return 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/50 shadow-2xl';
      case 'speaking':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-purple-500/50 shadow-2xl';
      case 'thinking':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-yellow-500/50 shadow-2xl';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-blue-500/50 hover:shadow-2xl';
    }
  };
  
  return (
    <div className="relative">
      {/* Pulse rings for listening state */}
      {isListening && isMicReady && (
        <>
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-red-500/30" />
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-red-500/20" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-red-500/10" style={{ animationDelay: '1s' }} />
        </>
      )}
      
      {/* Pulse rings for speaking state */}
      {isSpeaking && isMicReady && (
        <>
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-purple-500/30" />
          <div className="absolute inset-0 rounded-full animate-pulse-ring bg-purple-500/20" style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      {/* Main Button */}
      <button
        onClick={isMicReady ? onClick : undefined}
        disabled={!isMicReady}
        className={`
          relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full
          flex items-center justify-center transition-all duration-300
          ${getButtonStyles()}
          ${isListening && isMicReady ? 'animate-listening' : ''}
          ${isMicReady ? 'hover:scale-105 active:scale-95' : ''}
          shadow-xl
        `}
      >
        {/* Icon */}
        <svg 
          className="w-12 h-12 md:w-14 md:h-14 text-white drop-shadow-lg"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {!isMicReady ? (
            // Mic disabled icon
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H7a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5H5.586a1 1 0 00-.707.293L3.293 12.5a1 1 0 00-.293.707v1.586a1 1 0 00.293.707l1.586 1.586A1 1 0 005.586 15zM17 14.5a6 6 0 01-12 0" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11 L5 21 M5 11 L15 21" />
            </>
          ) : isListening ? (
            // Recording icon
            <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          ) : isThinking ? (
            // Thinking/Loading icon
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          ) : (
            // Mic icon
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-3 0h6m-6-7a3 3 0 01-3-3V5a3 3 0 116 0v10a3 3 0 01-3 3z" />
          )}
        </svg>
      </button>
    </div>
  );
}