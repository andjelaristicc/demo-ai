import React, { useEffect, useRef } from 'react';

interface TranscriptionMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface TranscriptionPanelProps {
  messages: TranscriptionMessage[];
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-3 bg-slate-900/50 rounded-xl border border-slate-800/50"
      style={{ scrollBehavior: 'smooth' }}
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
          <p>Awaiting conversation...</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <div 
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-slate-700 text-slate-100 rounded-tr-none' 
                    : 'bg-pink-600/10 text-pink-100 border border-pink-500/20 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                {msg.sender === 'user' ? 'You' : 'AI Assistant'}
              </span>
            </div>
          ))}
          <div ref={bottomRef} /> {/* Scroll anchor */}
        </>
      )}
    </div>
  );
};

export default TranscriptionPanel;