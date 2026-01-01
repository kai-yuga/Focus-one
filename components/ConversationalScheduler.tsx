import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Task, TimeBlock } from '../types';
import { generateScheduleFromChat } from '../services/geminiService';
import { Send, ArrowRight, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface ConversationalSchedulerProps {
  onPlanConfirmed: (tasks: Task[], schedule: TimeBlock[], explanation: string) => void;
  dayStart: string;
  dayEnd: string;
}

export const ConversationalScheduler: React.FC<ConversationalSchedulerProps> = ({ 
  onPlanConfirmed, dayStart, dayEnd 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: "Tell me about your day. What are your fixed commitments (classes, coaching) and what do you need to get done?", 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<Task[]>([]);
  const [previewSchedule, setPreviewSchedule] = useState<TimeBlock[]>([]);
  const [previewExplanation, setPreviewExplanation] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: input, 
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await generateScheduleFromChat([...messages, userMsg], dayStart, dayEnd);
      
      setPreviewTasks(result.tasks);
      setPreviewSchedule(result.schedule);
      setPreviewExplanation(result.explanation);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.explanation || "I've updated the plan based on that.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
      
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I had trouble understanding that. Could you clarify your timings?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] gap-6 animate-fade-in">
      {/* Chat Column */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
          <Sparkles size={16} className="text-stone-900" />
          <span className="font-bold text-stone-800 text-sm">Coach</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-stone-900 text-stone-50 rounded-tr-none' 
                  : 'bg-stone-100 text-stone-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
             <div className="flex justify-start">
               <div className="bg-stone-50 px-4 py-2 rounded-2xl text-xs text-stone-400 italic animate-pulse">
                 Building plan...
               </div>
             </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-stone-100">
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus-within:ring-2 focus-within:ring-stone-400 transition-all">
            <input 
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
              placeholder="e.g. School from 8-3, then study Math..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input || isProcessing}
              className="p-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="flex-1 flex flex-col bg-stone-50 rounded-xl border border-stone-200 overflow-hidden relative">
        <div className="p-4 border-b border-stone-200 bg-white flex justify-between items-center">
           <h3 className="font-bold text-stone-900 text-sm">Live Schedule Preview</h3>
           <span className="text-xs text-stone-500 font-mono">{previewSchedule.length} blocks</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
           {previewSchedule.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-2">
               <Clock size={32} className="opacity-20" />
               <p className="text-sm">Describe your day to see the plan here.</p>
             </div>
           ) : (
             previewSchedule.map((block) => (
               <div key={block.id} className="flex gap-3 text-xs md:text-sm bg-white p-3 rounded-lg border border-stone-200">
                 <div className="font-mono font-bold text-stone-500 w-20 text-right">{block.startTime}</div>
                 <div className="flex-1 font-medium text-stone-800">
                    {block.label}
                    {block.type !== 'work' && <span className="ml-2 text-[10px] uppercase text-stone-400 border border-stone-100 px-1 rounded">{block.type}</span>}
                 </div>
               </div>
             ))
           )}
        </div>

        {previewSchedule.length > 0 && (
          <div className="p-4 bg-white border-t border-stone-200">
            <button 
              onClick={() => onPlanConfirmed(previewTasks, previewSchedule, previewExplanation)}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition-all shadow-lg"
            >
              Start This Day <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};