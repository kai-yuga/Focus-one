import React, { useState, useEffect } from 'react';
import { AppMode, Task, TimeBlock, DayData } from './types';
import { PlanningView } from './components/PlanningView';
import { FocusView } from './components/FocusView';
import { ReflectionView } from './components/ReflectionView';
import { LifeProgressView } from './components/LifeProgressView';
import { generateDailyPlan, adaptiveReplan } from './services/geminiService';

// Fix: Use local date instead of UTC to prevent "Tomorrow" bug in Western timezones
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const App: React.FC = () => {
  // Default to FOCUS mode to act as the Dashboard (Home Page)
  const [mode, setMode] = useState<AppMode>('FOCUS');
  
  // Multi-day Store with Persistence
  const [days, setDays] = useState<Record<string, DayData>>(() => {
    if (typeof window !== 'undefined') {
        try {
            const saved = localStorage.getItem('focusOneData');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load data", e);
            return {};
        }
    }
    return {};
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // Save data whenever it changes
  useEffect(() => {
      try {
          localStorage.setItem('focusOneData', JSON.stringify(days));
      } catch (e) {
          console.error("Failed to save data", e);
      }
  }, [days]);

  // Derived Data Helpers
  const todayStr = getTodayStr();
  
  // Ensure today exists in store
  useEffect(() => {
    if (!days[todayStr]) {
       setDays(prev => ({
           ...prev,
           [todayStr]: { tasks: [], schedule: [], explanation: "", date: todayStr, distractions: [] }
       }));
    }
  }, [todayStr]); // Only check when date changes

  const getDayData = (date: string): DayData => {
      return days[date] || { tasks: [], schedule: [], explanation: "", date, distractions: [] };
  };

  const updateDayData = (date: string, updates: Partial<DayData>) => {
      setDays(prev => ({
          ...prev,
          [date]: { ...getDayData(date), ...updates }
      }));
  };

  const [isGenerating, setIsGenerating] = useState(false);

  // Initial Plan Generation (Always for Selected Date, usually Today)
  const handleGeneratePlan = async (start: string, end: string) => {
    setIsGenerating(true);
    
    // We plan for the selected date. If selected is not today, we treat it as planning ahead.
    const currentData = getDayData(selectedDate);
    const result = await generateDailyPlan(currentData.tasks, start, end, `Planning for ${selectedDate}`);
    
    updateDayData(selectedDate, {
        schedule: result.schedule,
        explanation: result.explanation
    });

    setMode('FOCUS');
    setIsGenerating(false);
  };

  // Plan Confirmed from Chat Mode
  const handleApplyChatPlan = (newTasks: Task[], newSchedule: TimeBlock[], newExplanation: string) => {
    updateDayData(selectedDate, {
        tasks: newTasks,
        schedule: newSchedule,
        explanation: newExplanation
    });
    setMode('FOCUS');
  };

  // Adaptive Re-planning (Currently forces Today's logic for simplicity, or Selected Date)
  // Replan usually implies "From Now", so it only makes sense for Today.
  const handleReplan = async (customContext?: string) => {
    if (selectedDate !== todayStr) {
        alert("You can only adapt the schedule for Today.");
        return;
    }

    setIsGenerating(true);
    const currentTime = getCurrentTimeStr();
    const currentData = getDayData(todayStr);
    
    // 0. CAPTURE STATE FOR UNDO
    const previousVersion = {
        tasks: currentData.tasks,
        schedule: currentData.schedule,
        explanation: currentData.explanation
    };

    // 1. PRESERVE HISTORY
    const pastBlocks: TimeBlock[] = [];
    
    currentData.schedule.forEach(block => {
        if (block.endTime <= currentTime) {
            pastBlocks.push(block);
        } else if (block.startTime < currentTime && block.endTime > currentTime) {
            // Truncate active block
            pastBlocks.push({
                ...block,
                id: `${block.id}-truncated`,
                endTime: currentTime,
                label: block.label.includes('(Partial)') ? block.label : `${block.label} (Partial)`,
                isCompleted: block.isCompleted,
                domain: block.domain
            });
        }
    });

    const replanContext = customContext || "Replanning for remainder of day.";
    
    // Use 23:59 as end time to allow late night replanning without error
    const result = await adaptiveReplan(
      currentData.tasks,
      currentTime, 
      "23:59", 
      replanContext
    );

    // 2. MERGE STATE
    const newBlocks = result.schedule;
    
    updateDayData(todayStr, {
        tasks: result.tasks,
        schedule: [...pastBlocks, ...newBlocks],
        explanation: result.explanation,
        previousVersion // Store snapshot
    });
    
    setIsGenerating(false);
  };

  const handleUndo = () => {
    const currentData = getDayData(selectedDate);
    if (currentData.previousVersion) {
        updateDayData(selectedDate, {
            tasks: currentData.previousVersion.tasks,
            schedule: currentData.previousVersion.schedule,
            explanation: currentData.previousVersion.explanation,
            previousVersion: undefined // Clear undo history
        });
    }
  };

  const handleToggleTask = (taskId: string) => {
    // We toggle the task on the SELECTED DATE
    const currentData = getDayData(selectedDate);
    let isNowCompleted = false;

    const newTasks = currentData.tasks.map(t => {
      if (t.id === taskId) {
        isNowCompleted = !t.completed;
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    let newSchedule = currentData.schedule;

    // Only update schedule logic if we are modifying TODAY
    if (selectedDate === todayStr) {
        if (isNowCompleted) {
          const currentTime = getCurrentTimeStr();
          newSchedule = currentData.schedule.flatMap(block => {
            if (block.taskId === taskId) {
              if (currentTime > block.startTime && currentTime < block.endTime) {
                const completedBlock: TimeBlock = { 
                  ...block, 
                  endTime: currentTime, 
                  isCompleted: true,
                  label: `${block.label} (Done)` 
                };
                const bufferBlock: TimeBlock = {
                  id: `${block.id}-buffer`,
                  startTime: currentTime,
                  endTime: block.endTime,
                  label: 'Efficiency Bonus',
                  type: 'break',
                  taskId: null,
                  isCompleted: false,
                  energyLevel: 'low',
                  domain: 'Routine'
                };
                return [completedBlock, bufferBlock];
              }
              return [{ ...block, isCompleted: true }];
            }
            return [block];
          });
        } else {
          newSchedule = currentData.schedule.map(b => b.taskId === taskId ? { ...b, isCompleted: false } : b);
        }
    } else {
        // For past/future days, just mark the block as completed visually, no time shifting
         if (isNowCompleted) {
            newSchedule = currentData.schedule.map(b => b.taskId === taskId ? { ...b, isCompleted: true } : b);
         } else {
            newSchedule = currentData.schedule.map(b => b.taskId === taskId ? { ...b, isCompleted: false } : b);
         }
    }

    updateDayData(selectedDate, {
        tasks: newTasks,
        schedule: newSchedule
    });
  };

  const handleAssistantAction = (action: { type: 'REPLAN' | 'MARK_COMPLETE', payload?: any }) => {
     if (action.type === 'REPLAN') {
        handleReplan(action.payload);
     } else if (action.type === 'MARK_COMPLETE') {
        // Assistant commands usually apply to TODAY's context
        if (selectedDate === todayStr) {
             handleToggleTask(action.payload);
        } else {
             alert("Coach actions only apply when viewing Today.");
        }
     }
  };

  const handleFinishDay = () => {
    setMode('REFLECTION');
  };

  const handleEndDayReflection = () => {
    // When ending reflection, we save the day's history (handled by useEffect/localStorage)
    // and return to the main view. We do NOT clear the data.
    // We could auto-advance to tomorrow, but staying on the dashboard allows reviewing the "Done" status.
    setMode('FOCUS'); 
  };

  const handleUpdateDistractions = (newDistractions: string[]) => {
      updateDayData(selectedDate, { distractions: newDistractions });
  };

  return (
    <div className="min-h-screen text-stone-900 font-sans selection:bg-stone-300">
      {mode === 'PLANNING' && (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
           <PlanningView 
             tasks={getDayData(selectedDate).tasks} 
             setTasks={(newTasks) => {
                 const t = typeof newTasks === 'function' ? newTasks(getDayData(selectedDate).tasks) : newTasks;
                 updateDayData(selectedDate, { tasks: t });
             }} 
             onGeneratePlan={handleGeneratePlan}
             onApplyChatPlan={handleApplyChatPlan}
             isGenerating={isGenerating}
           />
        </div>
      )}

      {mode === 'FOCUS' && (
        <div className="h-full">
           <FocusView 
             todayData={getDayData(todayStr)}
             selectedData={getDayData(selectedDate)}
             selectedDate={selectedDate}
             onSelectDate={setSelectedDate}
             onToggleTask={handleToggleTask}
             onFinishDay={handleFinishDay}
             onReplan={(ctx) => handleReplan(ctx)}
             onPlan={() => setMode('PLANNING')}
             isReplanning={isGenerating}
             onAction={handleAssistantAction}
             onViewProgress={() => setMode('PROGRESS')}
             onUndo={handleUndo}
             canUndo={!!getDayData(selectedDate).previousVersion}
             onUpdateDistractions={handleUpdateDistractions}
           />
        </div>
      )}

      {mode === 'PROGRESS' && (
        <LifeProgressView 
           tasks={getDayData(selectedDate).tasks}
           schedule={getDayData(selectedDate).schedule}
           onBack={() => setMode('FOCUS')}
        />
      )}

      {mode === 'REFLECTION' && (
        <ReflectionView 
          tasks={getDayData(selectedDate).tasks}
          onReset={handleEndDayReflection}
          distractions={getDayData(selectedDate).distractions}
        />
      )}
    </div>
  );
};

export default App;