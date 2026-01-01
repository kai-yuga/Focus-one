import React from 'react';
import { Task, TimeBlock, LifeDomain } from '../types';

interface DailyProgressChartProps {
  tasks: Task[];
  schedule: TimeBlock[];
  dateLabel: string;
}

export const DailyProgressChart: React.FC<DailyProgressChartProps> = ({ tasks, schedule, dateLabel }) => {
  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  const workBlocks = schedule.filter(b => b.type === 'work');
  const completedBlocks = workBlocks.filter(b => b.isCompleted);
  const blockProgress = workBlocks.length === 0 ? 0 : (completedBlocks.length / workBlocks.length) * 100;

  // Domain Breakdown (Minutes)
  const domains: LifeDomain[] = ['Academic', 'Skill', 'Health', 'Spirituality'];
  const domainData = domains.map(d => {
    const domainTasks = tasks.filter(t => t.domain === d);
    const completedMinutes = domainTasks
      .filter(t => t.completed)
      .reduce((acc, t) => acc + t.durationMinutes, 0);
    return { domain: d, minutes: completedMinutes };
  });

  const totalMinutes = domainData.reduce((acc, d) => acc + d.minutes, 0);

  const getDomainColor = (d: LifeDomain) => {
    switch(d) {
        case 'Academic': return 'bg-blue-400';
        case 'Skill': return 'bg-purple-400';
        case 'Health': return 'bg-green-400';
        case 'Spirituality': return 'bg-amber-400';
        default: return 'bg-stone-300';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6">
      <div className="flex justify-between items-end">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">Daily Overview</h3>
        <span className="text-xs text-stone-500">{dateLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Task Completion */}
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-stone-500">
                <span>Tasks</span>
                <span>{completedTasks}/{totalTasks}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-800 transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
            </div>
        </div>
        {/* Focus Consistency */}
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-stone-500">
                <span>Focus Blocks</span>
                <span>{completedBlocks.length}/{workBlocks.length}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-600 transition-all duration-1000" style={{ width: `${blockProgress}%` }} />
            </div>
        </div>
      </div>

      {/* Domain Distribution - Stacked Bar */}
      <div className="pt-2 space-y-3">
        <div className="flex justify-between items-end">
             <div className="text-xs font-semibold text-stone-400 uppercase">Time Distribution</div>
             <div className="text-xs font-mono text-stone-500">{totalMinutes}m Total</div>
        </div>
        
        {/* The Stacked Bar */}
        <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex">
            {totalMinutes === 0 ? (
                <div className="w-full h-full bg-stone-100" />
            ) : (
                domainData.map(d => {
                    if (d.minutes === 0) return null;
                    const widthPct = (d.minutes / totalMinutes) * 100;
                    return (
                        <div 
                            key={d.domain}
                            className={`h-full ${getDomainColor(d.domain)} transition-all duration-500`}
                            style={{ width: `${widthPct}%` }}
                            title={`${d.domain}: ${d.minutes}m`}
                        />
                    );
                })
            )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {domainData.map(d => (
                <div key={d.domain} className="flex items-center gap-1.5 opacity-80">
                    <div className={`w-2 h-2 rounded-full ${getDomainColor(d.domain)}`} />
                    <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wide">
                        {d.domain}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                        {d.minutes}m
                    </span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};