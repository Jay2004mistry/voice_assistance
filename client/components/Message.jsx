export default function Message({ role, content }) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[80%] ${isUser ? 'message-user' : 'message-ai'} p-3`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs opacity-70">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
        </div>
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}