
export type AppMode = 'PLANNING' | 'FOCUS' | 'REFLECTION' | 'PROGRESS';
export type Priority = 'non-negotiable' | 'high' | 'normal';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type LifeDomain = 'Academic' | 'Skill' | 'Health' | 'Spirituality' | 'Routine';

export interface Task {
  id: string;
  title: string;
  isFixed: boolean; 
  fixedTime?: string; // HH:mm, required if isFixed is true
  durationMinutes: number;
  completed: boolean;
  priority: Priority;
  energyLevel: EnergyLevel;
  domain: LifeDomain;
}

export interface TimeBlock {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  taskId: string | null;
  label: string;
  type: 'work' | 'break' | 'fixed' | 'routine';
  isCompleted: boolean;
  energyLevel?: EnergyLevel;
  priority?: Priority;
  domain?: LifeDomain;
}

export interface DayData {
  tasks: Task[];
  schedule: TimeBlock[];
  explanation: string;
  date: string; // YYYY-MM-DD
  distractions?: string[]; // New: captured thoughts during Zen Mode
  previousVersion?: {
    tasks: Task[];
    schedule: TimeBlock[];
    explanation: string;
  };
}

export interface ScheduleResult {
  schedule: TimeBlock[];
  explanation: string;
}

export interface ReplanResult extends ScheduleResult {
  tasks: Task[];
}

export interface ChatScheduleResult extends ScheduleResult {
  tasks: Task[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const MAX_TASKS_PER_DAY = 7;