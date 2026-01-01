import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { fastChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AICoachChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "I'm Coach. What's blocking you right now?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await fastChatResponse(messages, input);
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      // Error handled silently in UI for simplicity
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 md:bg-white">
      <div className="p-4 border-b border-stone-200 bg-white flex items-center gap-2">
        <div className="p-1.5 bg-stone-900 rounded-md">
           <Sparkles size={16} className="text-white" />
        </div>
        <span className="font-bold text-stone-800">Coach</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-stone-200 text-stone-900 rounded-tr-none' 
                : 'bg-stone-900 text-stone-50 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-stone-100 px-4 py-2 rounded-2xl text-xs text-stone-400 italic animate-pulse">
               Thinking...
             </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-stone-200 bg-white">
        <div className="flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2 border border-stone-200 focus-within:ring-2 focus-within:ring-stone-400 focus-within:bg-white transition-all">
          <input 
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            placeholder="Ask for advice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input || isLoading}
            className="text-stone-400 hover:text-stone-900 disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};