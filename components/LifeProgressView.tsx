import React, { useEffect, useState } from 'react';
import { LifeDomain, Task, TimeBlock } from '../types';
import { ArrowLeft, Activity, BookOpen, Brain, Dumbbell, Sparkles, AlertCircle } from 'lucide-react';
import { generateLifeProgressSummary } from '../services/geminiService';

interface LifeProgressViewProps {
  tasks: Task[];
  schedule: TimeBlock[];
  onBack: () => void;
}

export const LifeProgressView: React.FC<LifeProgressViewProps> = ({ tasks, schedule, onBack }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate stats per domain based on Today's Tasks & Schedule
  const domains: { id: LifeDomain; label: string; icon: any; color: string }[] = [
    { id: 'Academic', label: 'Academic / Exam', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 'Skill', label: 'Skill Building', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { id: 'Health', label: 'Physical Health', icon: Dumbbell, color: 'text-green-600 bg-green-50 border-green-100' },
    { id: 'Spirituality', label: 'Focus & Spirit', icon: Sparkles, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  ];

  const getDomainStats = (domainId: LifeDomain) => {
    const domainTasks = tasks.filter(t => t.domain === domainId);
    const plannedCount = domainTasks.length;
    const completedCount = domainTasks.filter(t => t.completed).length;
    
    // Calculate total minutes planned vs executed (approximate via tasks)
    const totalMinutes = domainTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    const completedMinutes = domainTasks.filter(t => t.completed).reduce((acc, t) => acc + t.durationMinutes, 0);
    
    let status = 'Inactive';
    if (plannedCount > 0) {
        if (completedCount === plannedCount) status = 'Strong';
        else if (completedCount > 0) status = 'Active';
        else status = 'Pending';
    }

    return { plannedCount, completedCount, totalMinutes, completedMinutes, status };
  };

  useEffect(() => {
    const fetchSummary = async () => {
        const text = await generateLifeProgressSummary(tasks, schedule);
        setSummary(text);
        setLoading(false);
    };
    fetchSummary();
  }, [tasks, schedule]);

  return (
    <div className="min-h-screen bg-stone-50 p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Activity size={24} /> Overall Life Tracker
          </h1>
        </div>

        {/* AI Summary Card */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-stone-800 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-2">System Analysis</h3>
          {loading ? (
             <div className="text-stone-400 italic animate-pulse">Synthesizing domain data...</div>
          ) : (
             <p className="text-stone-900 font-medium leading-relaxed">{summary}</p>
          )}
        </div>

        {/* Domain Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((d) => {
            const stats = getDomainStats(d.id);
            const isInactive = stats.plannedCount === 0;

            return (
              <div key={d.id} className={`p-6 rounded-xl border transition-all ${isInactive ? 'bg-stone-100 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div className={`p-3 rounded-lg ${d.color}`}>
                      <d.icon size={24} />
                   </div>
                   <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                       stats.status === 'Strong' ? 'bg-stone-900 text-white' : 
                       stats.status === 'Active' ? 'bg-stone-200 text-stone-800' : 
                       'bg-transparent text-stone-400 border border-stone-200'
                   }`}>
                       {stats.status}
                   </div>
                </div>
                
                <h3 className="text-lg font-bold text-stone-900 mb-1">{d.label}</h3>
                
                {isInactive ? (
                    <p className="text-xs text-stone-500">No focus blocks scheduled today.</p>
                ) : (
                    <div className="space-y-3 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Tasks Completed</span>
                            <span className="font-mono font-bold">{stats.completedCount} / {stats.plannedCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Time Invested</span>
                            <span className="font-mono font-bold">{stats.completedMinutes}m</span>
                        </div>
                        {/* Minimal Progress Bar */}
                        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-stone-800 transition-all duration-1000" 
                                style={{ width: `${(stats.completedCount / stats.plannedCount) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Philosophy Note */}
        <div className="text-center pt-8">
            <p className="text-xs text-stone-400 max-w-md mx-auto">
                This tracker reflects balance, not a score. 
                Consistency in one domain supports stability in others.
            </p>
        </div>

      </div>
    </div>
  );
};
