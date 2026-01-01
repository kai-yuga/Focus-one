import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Task } from '../types';
import { fastChatResponse } from '../services/geminiService';
import { Moon, Send, Sparkles, RefreshCcw } from 'lucide-react';

interface ReflectionViewProps {
  tasks: Task[];
  onReset: () => void;
  distractions?: string[]; // New prop
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({ tasks, onReset, distractions = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat
  useEffect(() => {
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const percentage = Math.round((completedCount / totalCount) * 100) || 0;

    let initialText = `Day complete. You finished ${completedCount}/${totalCount} tasks (${percentage}%). How do you feel about your performance?`;

    if (distractions.length > 0) {
        initialText += `\n\nI also noticed you captured some distractions during deep work (e.g., "${distractions[0]}"). Do we need to plan these for tomorrow?`;
    }

    setMessages([{ 
      id: 'init', 
      role: 'model', 
      text: initialText, 
      timestamp: Date.now() 
    }]);
  }, [tasks, distractions]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    // Context construction for the AI
    const taskContext = tasks.map(t => 
        `- ${t.title}: ${t.completed ? 'COMPLETED' : 'MISSED'} (${t.priority})`
    ).join('\n');

    const distractionContext = distractions.length > 0 
        ? `User captured these random thoughts while trying to focus: ${JSON.stringify(distractions)}` 
        : "No captured distractions.";

    const context = `
      User just finished their day. 
      Task List:
      ${taskContext}

      Distraction Vault (Thoughts they offloaded to keep focus):
      ${distractionContext}
      
      Goal: Help them debrief. Be supportive. If they have distractions, ask if they want to turn them into tasks for tomorrow.
    `;

    try {
      const responseText = await fastChatResponse([...messages, userMsg], input, context);
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      // Error handled silently
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-stone-900 text-stone-100 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-stone-800">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-800 rounded-full">
                <Moon size={20} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg">Evening Reflection</h1>
                <p className="text-xs text-stone-400">Debrief with Coach</p>
            </div>
        </div>
        
        <button
            onClick={onReset}
            className="flex items-center gap-2 bg-white text-stone-900 px-4 py-2 rounded-lg font-bold hover:bg-stone-200 transition-colors text-sm"
        >
            <RefreshCcw size={16} />
            End Day & Next
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-2xl text-md leading-relaxed ${
               msg.role === 'user' 
                 ? 'bg-stone-700 text-white rounded-tr-none' 
                 : 'bg-stone-800 text-stone-100 rounded-tl-none border border-stone-700'
             }`}>
                {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={12} /> Coach
                    </div>
                )}
                {msg.text}
             </div>
          </div>
        ))}
        {isSending && (
           <div className="flex justify-start">
              <div className="bg-stone-800 px-6 py-4 rounded-2xl rounded-tl-none border border-stone-700">
                 <div className="flex gap-1">
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-stone-900 border-t border-stone-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-stone-800 rounded-xl px-4 py-3 border border-stone-700 focus-within:ring-2 focus-within:ring-stone-500 transition-all">
           <input 
              className="flex-1 bg-transparent border-none focus:outline-none text-stone-100 placeholder-stone-500"
              placeholder="Reflect on your day..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              autoFocus
           />
           <button 
              onClick={handleSend}
              disabled={!input || isSending}
              className="p-2 bg-white text-stone-900 rounded-lg hover:bg-stone-200 disabled:opacity-50 transition-colors"
           >
              <Send size={18} />
           </button>
        </div>
        <p className="text-center text-xs text-stone-600 mt-3">
            Chat as long as you need. Press "End Day & Next" when ready.
        </p>
      </div>
    </div>
  );
};