
import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatConfig } from '@/types';
import { SendIcon, MessageCircleIcon, XIcon, ChevronDownIcon } from './Icons';
import { DEFAULT_CONFIG, SUGGESTED_QUESTIONS } from '@/constants';

interface ChatWidgetProps {
  config: ChatConfig;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: config.greeting,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  // Reset messages when site/config changes
  setMessages([
    {
      id: '1',
      role: 'assistant',
      content: config.greeting,
      timestamp: new Date()
    }
  ]);
}, [config.previewUrl, config.greeting]); 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

const handleSend = async (text?: string) => {
  const messageText = text || inputValue;
  if (!messageText.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: messageText,
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, userMessage]);
  setInputValue("");
  setIsTyping(true);

  try {
const response = await fetch('/api/gpt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: messageText,
    systemPrompt: config.systemPrompt,  // This has EVERYTHING already!
    conversationHistory: messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  }),
});

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: data.response,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);
  } catch (error) {
    console.error('Error:', error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "I apologize, but I'm having trouble connecting right now. Please try again.",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsTyping(false);
  }
};


  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <div 
        className={`mb-4 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between text-white"
          style={{ backgroundColor: config.primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={config.avatarUrl} alt="Bot Avatar" className="w-10 h-10 rounded-full border-2 border-white/20" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{config.businessName} Assistant</h3>
              <p className="text-[11px] opacity-80 uppercase tracking-wider">Online • Typically replies in seconds</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-black/10 rounded-full transition-colors"
          >
            <ChevronDownIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Message Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
                }`}
              >
                {msg.content}
                <div className={`text-[10px] mt-1 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-700 shadow-sm border border-slate-100 p-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          
          {/* Suggestions */}
          {!isTyping && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-bottom-1 duration-500">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 bg-white border border-pink-200 text-pink-600 rounded-full text-xs hover:bg-pink-50 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim()}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                inputValue.trim() 
                  ? 'bg-pink-600 text-white shadow-lg hover:shadow-pink-500/20' 
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <SendIcon className="w-5 h-5 ml-0.5" />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Powered by <b>Cosmetix AI</b>
          </p>
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 text-white bg-pink-600 hover:bg-pink-700"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className={`absolute transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
          <MessageCircleIcon className="w-8 h-8" />
        </div>
        <div className={`absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
          <XIcon className="w-8 h-8" />
        </div>
        
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
            1
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
