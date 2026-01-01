import React, { useState } from 'react';
import { Task, TimeBlock, MAX_TASKS_PER_DAY, Priority, EnergyLevel, LifeDomain } from '../types';
import { Plus, Trash2, Lock, Clock, BrainCircuit, Zap, AlertCircle, MessageSquare, Layers } from 'lucide-react';
import { ConversationalScheduler } from './ConversationalScheduler';

interface PlanningViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onGeneratePlan: (start: string, end: string) => void;
  // New props for handling conversational output
  onApplyChatPlan?: (tasks: Task[], schedule: TimeBlock[], explanation: string) => void;
  isGenerating: boolean;
}

export const PlanningView: React.FC<PlanningViewProps> = ({ 
  tasks, setTasks, onGeneratePlan, onApplyChatPlan, isGenerating 
}) => {
  const [mode, setMode] = useState<'manual' | 'chat'>('manual');
  
  // Manual State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [isFixed, setIsFixed] = useState(false);
  const [fixedTime, setFixedTime] = useState('09:00');
  const [priority, setPriority] = useState<Priority>('normal');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [domain, setDomain] = useState<LifeDomain>('Academic');
  
  // Global Schedule Settings
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('22:00');

  const hasNonNegotiable = tasks.some(t => t.priority === 'non-negotiable');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    if (tasks.length >= MAX_TASKS_PER_DAY) return;
    if (priority === 'non-negotiable' && hasNonNegotiable) {
      alert("You can only have one Non-Negotiable task per day.");
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      durationMinutes: newTaskDuration,
      isFixed,
      fixedTime: isFixed ? fixedTime : undefined,
      completed: false,
      priority,
      energyLevel: energy,
      domain
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setIsFixed(false);
    setPriority('normal');
    setEnergy('medium');
    setDomain('Academic'); // Reset to default
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const priorityColor = (p: Priority) => {
    switch (p) {
      case 'non-negotiable': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <header className="space-y-4 md:flex md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Design Your Day</h1>
          <p className="text-stone-500">How do you want to plan today?</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
          <button 
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'manual' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Manual List
          </button>
          <button 
            onClick={() => setMode('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'chat' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            <MessageSquare size={16} />
            Talk to Coach
          </button>
        </div>
      </header>

      {/* Shared Constraints Section */}
      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-stone-200">
        <div>
          <label className="block text-xs font-semibold uppercase text-stone-400 mb-1">Start Day</label>
          <input 
            type="time" 
            value={dayStart} 
            onChange={e => setDayStart(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-stone-400 mb-1">End Day</label>
          <input 
            type="time" 
            value={dayEnd} 
            onChange={e => setDayEnd(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 font-mono text-sm"
          />
        </div>
      </div>

      {mode === 'chat' ? (
        <ConversationalScheduler 
           dayStart={dayStart} 
           dayEnd={dayEnd} 
           onPlanConfirmed={(t, s, e) => onApplyChatPlan && onApplyChatPlan(t, s, e)}
        />
      ) : (
        <>
          {/* Manual Input Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Task name..."
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-stone-400 focus:outline-none text-lg"
                disabled={tasks.length >= MAX_TASKS_PER_DAY}
              />
              
              <div className="flex flex-wrap gap-3 items-center">
                 {/* Domain Select */}
                 <div className="relative">
                   <select
                     value={domain}
                     onChange={(e) => setDomain(e.target.value as LifeDomain)}
                     className="appearance-none bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 pl-8 text-sm text-stone-700"
                   >
                     <option value="Academic">Academic</option>
                     <option value="Skill">Skill (Trading/Code)</option>
                     <option value="Health">Physical Health</option>
                     <option value="Spirituality">Focus/Spirit</option>
                     <option value="Routine">Routine</option>
                   </select>
                   <Layers size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
                 </div>

                 {/* Duration */}
                 <select 
                   value={newTaskDuration} 
                   onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                   className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700"
                 >
                   <option value={15}>15m</option>
                   <option value={30}>30m</option>
                   <option value={45}>45m</option>
                   <option value={60}>1h</option>
                   <option value={90}>1.5h</option>
                   <option value={120}>2h</option>
                 </select>

                 {/* Priority */}
                 <select 
                   value={priority} 
                   onChange={(e) => setPriority(e.target.value as Priority)}
                   className={`border rounded-lg px-3 py-2 text-sm font-medium ${priority === 'non-negotiable' ? 'border-red-300 text-red-700 bg-red-50' : 'border-stone-200 bg-stone-50'}`}
                 >
                   <option value="normal">Normal</option>
                   <option value="high">High Impact</option>
                   <option value="non-negotiable" disabled={hasNonNegotiable && priority !== 'non-negotiable'}>
                     Non-Negotiable {hasNonNegotiable && priority !== 'non-negotiable' ? '(Limit 1)' : ''}
                   </option>
                 </select>

                 {/* Energy */}
                 <select 
                   value={energy} 
                   onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
                   className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700"
                 >
                   <option value="high">⚡ High Energy</option>
                   <option value="medium">💧 Med Energy</option>
                   <option value="low">💤 Low Energy</option>
                 </select>

                 {/* Fixed Time Toggle */}
                 <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                    <button 
                      onClick={() => setIsFixed(!isFixed)}
                      className={`p-2 rounded-lg border transition-colors ${isFixed ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-400'}`}
                      title="Fixed Time Constraint"
                    >
                      <Lock size={18} />
                    </button>
                    {isFixed && (
                      <input 
                        type="time" 
                        value={fixedTime}
                        onChange={(e) => setFixedTime(e.target.value)}
                        className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-2 text-sm font-mono"
                      />
                    )}
                 </div>

                 <div className="flex-1"></div>

                 <button 
                   onClick={handleAddTask}
                   disabled={tasks.length >= MAX_TASKS_PER_DAY || !newTaskTitle}
                   className="bg-stone-900 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-stone-800 transition-colors flex items-center gap-2"
                 >
                   <Plus size={18} /> Add
                 </button>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {tasks.length === 0 && (
              <div className="text-center py-10 text-stone-400 italic bg-stone-50 rounded-xl border border-dashed border-stone-300">
                No tasks. Add manually or talk to the coach.
              </div>
            )}
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`p-2 rounded-full border ${priorityColor(task.priority)}`}>
                     {task.priority === 'non-negotiable' ? <AlertCircle size={16} /> : <div className="w-4 h-4 rounded-full bg-current opacity-20" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">{task.title}</span>
                      {task.isFixed && (
                        <span className="text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">
                          {task.fixedTime}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                         {task.domain}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {task.durationMinutes}m</span>
                      <span className="flex items-center gap-1 capitalize"><Zap size={12} /> {task.energyLevel} Energy</span>
                      <span className="capitalize text-stone-400">{task.priority.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeTask(task.id)}
                  className="text-stone-300 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={() => onGeneratePlan(dayStart, dayEnd)}
              disabled={tasks.length === 0 || isGenerating}
              className="flex items-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl w-full md:w-auto justify-center"
            >
              {isGenerating ? (
                <span className="animate-pulse">Analyzing & Scheduling...</span>
              ) : (
                <>
                  <BrainCircuit size={20} />
                  Generate Schedule
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
