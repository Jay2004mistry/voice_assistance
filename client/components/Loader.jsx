export default function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-wave" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-wave" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-wave" style={{ animationDelay: '0.4s' }} />
      </div>
      <span className="text-gray-400 text-sm">AI is thinking...</span>
    </div>
  );
}