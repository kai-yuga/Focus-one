import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { ChatMessage, Task, TimeBlock } from '../types';
import { getFloatingCoachResponse } from '../services/geminiService';

interface FloatingAssistantProps {
  schedule: TimeBlock[];
  tasks: Task[];
  onAction: (action: { type: 'REPLAN' | 'MARK_COMPLETE'; payload?: any }) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ schedule, tasks, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Robust Context Builder
  const getContextString = () => {
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const getMinutes = (timeStr: string) => {
       const [h, m] = timeStr.split(':').map(Number);
       return h * 60 + m;
    };
    const currentMinutes = getMinutes(currentTimeStr);

    // Identify Active Block
    const activeBlock = schedule.find(b => {
      const start = getMinutes(b.startTime);
      const end = getMinutes(b.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });

    // Identify Active Task details
    let activeTaskInfo = "None";
    if (activeBlock && activeBlock.taskId) {
        const task = tasks.find(t => t.id === activeBlock.taskId);
        if (task) {
            activeTaskInfo = `ID: ${task.id}, Title: "${task.title}", Status: ${task.completed ? 'COMPLETED' : 'PENDING'}`;
        }
    }

    const nextBlock = schedule
      .filter(b => getMinutes(b.startTime) > currentMinutes)
      .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime))[0];

    return `
      Current Time: ${currentTimeStr}
      Active Block: ${activeBlock ? `${activeBlock.label} (${activeBlock.type}) until ${activeBlock.endTime}` : 'None'}
      Active Task Detail: ${activeTaskInfo}
      Next Block: ${nextBlock ? `${nextBlock.label} at ${nextBlock.startTime}` : 'None'}
      Stats: ${tasks.filter(t => t.completed).length}/${tasks.length} tasks done.
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now() };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const context = getContextString();
      const result = await getFloatingCoachResponse(messages, context, userText);
      
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: result.text, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, aiMsg]);

      // Handle Intent
      if (result.intent === 'REPLAN') {
         onAction({ type: 'REPLAN', payload: result.replanContext });
      } else if (result.intent === 'MARK_COMPLETE' && result.taskId) {
         onAction({ type: 'MARK_COMPLETE', payload: result.taskId });
      }

    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Connection error.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-stone-800 text-white rotate-90' : 'bg-stone-900 text-white'
        }`}
        title="AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[550px] bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 flex flex-col animate-fade-in-up overflow-hidden">
          {/* Header */}
          <div className="p-3 bg-stone-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={14} />
              <span className="font-bold text-sm">Controller</span>
            </div>
            <div className="text-[10px] bg-stone-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center text-stone-400 text-xs mt-10 space-y-2">
                <p>System Online.</p>
                <p>I can help with your schedule or answer general questions.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs md:text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-stone-200 text-stone-900 rounded-tr-none' 
                    : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white px-3 py-2 rounded-xl border border-stone-200 shadow-sm">
                   <Loader2 size={16} className="animate-spin text-stone-400" />
                 </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-stone-200">
            <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus-within:ring-2 focus-within:ring-stone-400 transition-all">
              <input 
                className="flex-1 bg-transparent border-none focus:outline-none text-xs"
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                autoFocus
              />
              <button 
                onClick={handleSend}
                disabled={!input || isLoading}
                className="text-stone-400 hover:text-stone-900 transition-colors"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};