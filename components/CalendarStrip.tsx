import React, { useRef, useEffect } from 'react';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({ selectedDate, onSelectDate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Generate a window of dates around Today (static range for simplicity in this demo)
  // Range: Today - 5 days to Today + 7 days
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = -5; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && 
           date.getMonth() === t.getMonth() && 
           date.getFullYear() === t.getFullYear();
  };

  // Scroll active date into view smoothly
  useEffect(() => {
    const index = dates.findIndex(d => formatDate(d) === selectedDate);
    if (index !== -1 && buttonsRef.current[index]) {
      buttonsRef.current[index]?.scrollIntoView({ 
        behavior: 'smooth', 
        inline: 'center', 
        block: 'nearest' 
      });
    }
  }, [selectedDate]);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-4 px-4" ref={scrollRef}>
      <div className="flex gap-3 w-max mx-auto md:mx-0">
        {dates.map((date, index) => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(date);

          return (
            <button
              key={dateStr}
              ref={(el) => { buttonsRef.current[index] = el; }}
              onClick={() => onSelectDate(dateStr)}
              className={`
                flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all duration-200 shrink-0
                ${isSelected 
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-105' 
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                }
                ${isTodayDate && !isSelected ? 'ring-2 ring-stone-200 ring-offset-1' : ''}
              `}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                {date.getDate()}
              </span>
              {isTodayDate && (
                <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-stone-900'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};