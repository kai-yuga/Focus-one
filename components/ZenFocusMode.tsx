import React, { useState, useEffect } from 'react';
import { Minimize2, Send, Wind, CheckCircle2, CalendarClock } from 'lucide-react';
import { TimeBlock, Task } from '../types';

interface ZenFocusModeProps {
  block: TimeBlock;
  task?: Task;
  onExit: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onAddDistraction: (text: string) => void;
}

export const ZenFocusMode: React.FC<ZenFocusModeProps> = ({ 
  block, task, onExit, onComplete, onReschedule, onAddDistraction 
}) => {
  const [distraction, setDistraction] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showSaved, setShowSaved] = useState(false);

  // Timer Logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const [endH, endM] = block.endTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(endH, endM, 0);
      
      // If end time is past midnight (edge case), add a day
      if (endDate.getTime() < now.getTime()) {
          // Just show 00:00 if passed
          return "00:00";
      }

      const diff = endDate.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft()); // Initial call

    return () => clearInterval(timer);
  }, [block.endTime]);

  const handleSaveDistraction = () => {
    if (!distraction.trim()) return;
    onAddDistraction(distraction);
    setDistraction('');
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-stone-950 z-[100] flex flex-col items-center justify-between text-stone-300 p-8 animate-fade-in selection:bg-stone-700">
      
      {/* Header */}
      <div className="w-full flex justify-between items-start">
         <div className="flex items-center gap-2 text-stone-500 font-mono text-sm uppercase tracking-widest">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> Live Session
         </div>
         <button 
            onClick={onExit}
            className="text-stone-500 hover:text-white transition-colors flex items-center gap-2"
          >
            <Minimize2 size={24} /> Exit
          </button>
      </div>

      {/* Center Focus Area */}
      <div className="flex flex-col items-center justify-center space-y-12 max-w-4xl text-center relative">
        
        {/* Breathing Animation Ring */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-stone-800 rounded-full opacity-20 animate-[ping_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-stone-800 rounded-full opacity-40 animate-[ping_6s_ease-in-out_infinite] delay-1000" />

        <div className="relative z-10 space-y-6">
            <h2 className="text-xl md:text-2xl font-light text-stone-400">Current Objective</h2>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight">
                {block.label}
            </h1>
            
            <div className="font-mono text-4xl md:text-5xl text-stone-500 tabular-nums">
                {timeLeft}
            </div>
        </div>

        {/* Controls */}
        {block.taskId && (
            <div className="flex gap-4 pt-8 relative z-10">
                <button 
                    onClick={onReschedule}
                    className="px-8 py-3 rounded-full border border-stone-700 text-stone-400 font-bold hover:bg-stone-800 hover:text-white transition-colors flex items-center gap-2"
                >
                    <CalendarClock size={18} /> Reschedule
                </button>
                <button 
                    onClick={onComplete}
                    className="bg-white text-stone-950 px-8 py-3 rounded-full font-bold text-lg hover:bg-stone-200 transition-colors flex items-center gap-2 shadow-lg shadow-stone-900/50"
                >
                    <CheckCircle2 size={20} /> Complete Task
                </button>
            </div>
        )}
      </div>

      {/* Footer: Distraction Vault */}
      <div className="w-full max-w-lg relative z-20">
         <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800 p-4 rounded-xl transition-all focus-within:border-stone-600 focus-within:ring-1 focus-within:ring-stone-600">
            <label className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500 mb-2">
                <Wind size={14} /> Distraction Vault
            </label>
            <div className="flex gap-2">
                <input 
                    type="text"
                    value={distraction}
                    onChange={(e) => setDistraction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveDistraction()}
                    placeholder="Intrusive thought? Type it here to save for later..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-stone-200 placeholder-stone-600"
                />
                <button 
                    onClick={handleSaveDistraction}
                    disabled={!distraction}
                    className="text-stone-400 hover:text-white disabled:opacity-30"
                >
                    <Send size={16} />
                </button>
            </div>
         </div>
         {showSaved && (
             <div className="absolute -top-10 left-0 right-0 text-center text-green-500 text-xs font-bold animate-fade-in-up">
                 Saved to Reflection Vault. Focus restored.
             </div>
         )}
      </div>
    </div>
  );
};