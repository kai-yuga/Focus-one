import React, { useEffect, useState } from 'react';
import { DayData, Task, TimeBlock } from '../types';
import { CheckCircle2, Circle, Clock, Maximize2, RefreshCw, Zap, Coffee, PlayCircle, Moon, CheckSquare, Square, ThumbsUp, Activity, ArrowRight, AlertCircle, CalendarClock, RotateCcw, LogOut } from 'lucide-react';
import { AICoachChat } from './AICoachChat';
import { FloatingAssistant } from './FloatingAssistant';
import { CalendarStrip } from './CalendarStrip';
import { DailyProgressChart } from './DailyProgressChart';
import { ZenFocusMode } from './ZenFocusMode';

interface FocusViewProps {
  todayData: DayData;
  selectedData: DayData;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onToggleTask: (taskId: string) => void;
  onFinishDay: () => void;
  onReplan: (context?: string) => void;
  onPlan: () => void;
  isReplanning: boolean;
  onAction?: (action: { type: 'REPLAN' | 'MARK_COMPLETE'; payload?: any }) => void;
  onViewProgress: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onUpdateDistractions?: (distractions: string[]) => void; // New prop
}

// Helper to convert HH:mm to minutes from midnight
const getMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper for current time string HH:mm
const getCurrentTimeStr = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const FocusView: React.FC<FocusViewProps> = ({ 
  todayData, selectedData, selectedDate, onSelectDate, 
  onToggleTask, onFinishDay, onReplan, onPlan, isReplanning, onAction, onViewProgress,
  onUndo, canUndo, onUpdateDistractions
}) => {
  const [now, setNow] = useState(new Date());
  const [zenMode, setZenMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000); 
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (toast?.visible) {
      const timer = setTimeout(() => setToast(prev => prev ? { ...prev, visible: false } : null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg: string) => setToast({ message: msg, visible: true });

  const currentTimeStr = getCurrentTimeStr(now);
  const currentMinutes = getMinutes(currentTimeStr);

  // --- NOW MODE LOGIC (ALWAYS USES TODAY'S DATA) ---
  const todayScheduleSorted = [...todayData.schedule].sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));
  const hasPlan = todayData.tasks.length > 0;
  
  // 1. Identify Active Block
  let activeBlock = todayScheduleSorted.find(b => {
    const start = getMinutes(b.startTime);
    const end = getMinutes(b.endTime);
    return currentMinutes >= start && currentMinutes < end;
  });

  // 2. Identify Next Future Block
  let nextBlock: TimeBlock | undefined;
  if (!activeBlock && hasPlan) {
      nextBlock = todayScheduleSorted.find(b => getMinutes(b.startTime) > currentMinutes);
  }

  // 3. Identify Pending Tasks (Strict Completion Rule)
  const incompleteTasks = todayData.tasks.filter(t => !t.completed);
  const hasIncompleteTasks = incompleteTasks.length > 0;

  // --- SELECTED DATE LOGIC ---
  const viewSchedule = selectedData.schedule;
  const viewTasks = selectedData.tasks;
  const isViewingToday = selectedDate === todayData.date;

  const handleAssistantAction = (action: { type: 'REPLAN' | 'MARK_COMPLETE'; payload?: any }) => {
      if (onAction) {
          onAction(action);
          if (action.type === 'MARK_COMPLETE') showToast("Task marked complete by Coach.");
      }
  };

  const handleAddDistraction = (text: string) => {
      if (onUpdateDistractions) {
          const current = todayData.distractions || [];
          onUpdateDistractions([...current, text]);
      }
  };

  // Zen Mode Overlay
  if (zenMode && activeBlock) {
    return (
        <ZenFocusMode 
            block={activeBlock}
            task={activeBlock.taskId ? todayData.tasks.find(t => t.id === activeBlock!.taskId) : undefined}
            onExit={() => setZenMode(false)}
            onComplete={() => {
                if(isViewingToday && activeBlock!.taskId) onToggleTask(activeBlock!.taskId);
                setZenMode(false);
            }}
            onReschedule={() => {
                onReplan("Reschedule this task for later.");
                setZenMode(false);
            }}
            onAddDistraction={handleAddDistraction}
        />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 relative">
      <FloatingAssistant 
         schedule={todayData.schedule} 
         tasks={todayData.tasks} 
         onAction={handleAssistantAction} 
      />

      {/* TOAST */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-500 ease-out ${toast?.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-stone-700">
           <div className="bg-green-500 rounded-full p-1"><CheckCircle2 size={16} className="text-white" /></div>
           <span className="font-medium text-sm">{toast?.message}</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            
            {/* 1. NOW MODE SECTION (Fixed to Today) */}
            <header className="flex justify-between items-start">
               <div>
                 <h2 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
                    {now.toLocaleDateString('en-US', { weekday: 'long' })}
                 </h2>
                 <div className="flex items-center gap-2 text-stone-500 font-mono text-lg mt-1">
                    <Clock size={16} /> {currentTimeStr}
                 </div>
               </div>
               <div className="flex gap-2">
                 {canUndo && onUndo && (
                   <button 
                      onClick={onUndo} 
                      className="bg-white border border-stone-200 hover:bg-stone-100 p-2 rounded-lg text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2 shadow-sm"
                      title="Undo last change"
                   >
                      <RotateCcw size={20} />
                      <span className="hidden md:inline font-medium text-sm">Undo</span>
                   </button>
                 )}
                 <button onClick={() => onReplan()} disabled={isReplanning} className="bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-stone-600 transition-colors flex items-center gap-2" title="Replan / Reschedule Today">
                    <RefreshCw size={20} className={isReplanning ? "animate-spin" : ""} />
                    <span className="hidden md:inline font-medium text-sm">Reschedule</span>
                 </button>
                 <button onClick={onViewProgress} className="bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-stone-600 transition-colors" title="Full Life Tracker">
                    <Activity size={20} />
                 </button>
                 {hasPlan && isViewingToday && (
                     <button onClick={onFinishDay} className="bg-stone-900 hover:bg-stone-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2" title="End Day / Reflection">
                        <LogOut size={20} />
                        <span className="hidden md:inline font-medium text-sm">Finish</span>
                     </button>
                 )}
               </div>
            </header>

            {/* Active Task Card */}
            {activeBlock ? (
                <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap size={120} />
                   </div>
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Now Active</span>
                        {activeBlock.type === 'work' && (
                            <button onClick={() => setZenMode(true)} className="text-stone-400 hover:text-white flex items-center gap-2 bg-stone-800 px-3 py-1 rounded-full text-xs font-bold transition-all hover:bg-stone-700">
                                <Maximize2 size={14}/> Zen Mode
                            </button>
                        )}
                      </div>
                      <h3 className="text-3xl font-bold mb-2">{activeBlock.label}</h3>
                      <div className="text-stone-400 font-mono text-sm mb-6">
                         {activeBlock.startTime} - {activeBlock.endTime}
                      </div>
                      <div className="flex items-center gap-3">
                          {activeBlock.taskId && (
                             <button 
                                onClick={() => {
                                    onToggleTask(activeBlock.taskId!);
                                    showToast("Keep pushing!");
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-900 px-4 py-3 rounded-lg font-bold hover:bg-stone-200 transition-colors"
                             >
                                {todayData.tasks.find(t => t.id === activeBlock!.taskId)?.completed ? (
                                    <>Done <CheckCircle2 size={16}/></>
                                ) : (
                                    <>Complete <Circle size={16}/></>
                                )}
                             </button>
                          )}
                          {/* Reschedule Button */}
                          <button 
                            onClick={() => onReplan("Reschedule this task.")}
                            className="px-4 py-3 rounded-lg font-bold border border-stone-600 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors flex items-center gap-2"
                            title="Reschedule / Push Back"
                          >
                             <CalendarClock size={20} />
                          </button>
                      </div>

                      {activeBlock.type === 'break' && (
                          <div className="flex items-center gap-2 text-green-400 mt-2"><Coffee size={20}/> Recharge Phase</div>
                      )}
                   </div>
                </div>
            ) : (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-stone-500">
                    {hasPlan ? (
                        nextBlock ? (
                            <div className="py-4">
                                <Coffee size={32} className="mx-auto mb-3 text-stone-400"/>
                                <h3 className="text-xl font-bold text-stone-900 mb-1">Free Time</h3>
                                <p className="text-stone-400 text-sm">Next up: <span className="text-stone-800 font-medium">{nextBlock.label}</span> at {nextBlock.startTime}</p>
                            </div>
                        ) : hasIncompleteTasks ? (
                            // Schedule finished, but tasks remain
                            <div className="py-4">
                                <AlertCircle size={32} className="mx-auto mb-3 text-stone-400"/>
                                <h3 className="text-xl font-bold text-stone-900 mb-1">Tasks Remaining</h3>
                                <p className="text-stone-400 text-sm mb-4">The schedule is over, but {incompleteTasks.length} tasks are incomplete.</p>
                                
                                <button 
                                    onClick={() => onReplan("Reschedule remaining tasks for the rest of the day or move them.")}
                                    className="mb-6 bg-stone-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 mx-auto text-sm"
                                >
                                    <CalendarClock size={16} /> Reschedule Remaining
                                </button>

                                <div className="flex flex-col gap-2 max-w-sm mx-auto">
                                    {incompleteTasks.slice(0, 3).map(t => (
                                        <div key={t.id} className="text-left bg-stone-50 p-2 rounded-lg border border-stone-100 flex justify-between items-center group hover:bg-stone-100 transition-colors">
                                            <span className="text-xs font-medium truncate text-stone-700">{t.title}</span>
                                            <button onClick={() => onToggleTask(t.id)} className="text-stone-400 hover:text-stone-900 transition-colors">
                                                <Square size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                    {incompleteTasks.length > 3 && (
                                        <span className="text-xs text-stone-400 mt-1">and {incompleteTasks.length - 3} more...</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // STRICT DAY COMPLETE: No Active, No Next, No Incomplete
                            <div className="py-4">
                                <ThumbsUp size={32} className="mx-auto mb-3 text-stone-400"/>
                                <h3 className="text-xl font-bold text-stone-900 mb-1">Day Complete</h3>
                                <p className="text-stone-400 text-sm">All tasks finished. Great work.</p>
                                <button onClick={onFinishDay} className="mt-4 text-stone-900 font-bold underline text-sm hover:text-stone-700 decoration-2 underline-offset-4">
                                    Go to Reflection
                                </button>
                            </div>
                        )
                    ) : (
                        // ONLY SHOW LAUNCH BUTTON IF NO PLAN EXISTS (Initial Setup)
                        <div className="py-4">
                           <Moon size={32} className="mx-auto mb-2 opacity-50"/>
                           <p className="mb-4">No plan set for today.</p>
                           {isViewingToday && (
                               <button onClick={onPlan} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 flex items-center gap-2 mx-auto">
                                   Start My Day <ArrowRight size={16}/>
                               </button>
                           )}
                        </div>
                    )}
                </div>
            )}

            {/* 2. CALENDAR STRIP */}
            <div className="border-t border-b border-stone-200 bg-stone-50 -mx-4 md:-mx-8">
               <CalendarStrip selectedDate={selectedDate} onSelectDate={onSelectDate} />
            </div>

            {/* 3. DAILY TASK LIST (Selected Date) */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h3 className="font-bold text-stone-900 uppercase tracking-wide text-sm">
                        {isViewingToday ? "Today's Plan" : `Plan for ${selectedDate}`}
                    </h3>
                </div>
                
                {viewSchedule.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 bg-white rounded-xl border border-dashed border-stone-200">
                        No plan for this date. 
                        {isViewingToday && !hasPlan && <button onClick={onPlan} className="ml-2 underline text-stone-600 hover:text-stone-900">Create one?</button>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {viewSchedule.map(block => {
                            const task = block.taskId ? viewTasks.find(t => t.id === block.taskId) : null;
                            const isDone = block.isCompleted || (task?.completed);
                            const isActive = activeBlock?.id === block.id;

                            return (
                                <div key={block.id} className={`flex items-center p-4 bg-white rounded-xl border transition-all ${isDone ? 'opacity-60 bg-stone-50' : isActive ? 'border-stone-900 ring-1 ring-stone-900 shadow-sm' : 'border-stone-200'}`}>
                                    <div className="w-16 font-mono text-xs text-stone-500 text-right mr-4">
                                        {block.startTime}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-medium ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                                            {block.label}
                                        </div>
                                        <div className="flex gap-2 text-[10px] uppercase font-bold text-stone-400 mt-1">
                                            {block.type !== 'work' && <span>{block.type}</span>}
                                            {block.domain && <span className="border border-stone-100 px-1 rounded">{block.domain}</span>}
                                        </div>
                                    </div>
                                    {block.taskId && (
                                        <button 
                                            onClick={() => onToggleTask(block.taskId!)}
                                            className={`p-2 rounded-lg transition-colors ${isDone ? 'text-stone-400' : 'text-stone-900 hover:bg-stone-100'}`}
                                        >
                                            {isDone ? <CheckSquare size={20}/> : <Square size={20}/>}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. DAILY PROGRESS CHART */}
            <DailyProgressChart tasks={viewTasks} schedule={viewSchedule} dateLabel={selectedDate} />

        </div>
      </div>

      {/* Right: AI Coach Sidebar */}
      <div className="w-80 border-l border-stone-200 bg-white hidden xl:block shadow-xl z-20">
        <AICoachChat />
      </div>
    </div>
  );
};