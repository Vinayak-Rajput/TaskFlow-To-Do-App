import React, { useState, useEffect } from 'react';
import { Task, TaskType, DurationUnit, Priority, Duration } from '../types';
import { Check, Clock, Calendar, ChevronDown, ChevronUp, Pencil, Trash2, CalendarClock, Timer } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onEdit }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!task.dueDate || task.completed) {
        setTimeLeft('');
        return;
    }

    const calculateTimeLeft = () => {
        const now = Date.now();
        const diff = task.dueDate! - now;
        
        if (diff < 0) {
            setTimeLeft('Overdue');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 1) {
            setTimeLeft(`${days} days left`);
        } else if (days === 1) {
             setTimeLeft('1 day left');
        } else if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m left`);
        } else {
            setTimeLeft(`${minutes}m left`);
        }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [task.dueDate, task.completed]);

  const getPriorityStyles = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30';
      case Priority.MEDIUM: return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/30';
      case Priority.LOW: return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/30';
    }
  };

  const formatDurationSmart = (d: Duration) => {
    if (d.unit === DurationUnit.MINUTES && d.value >= 60) {
        const hours = Math.floor(d.value / 60);
        const mins = Math.round(d.value % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    if (d.unit === DurationUnit.DAYS && d.value >= 7) {
         const weeks = parseFloat((d.value / 7).toFixed(1));
         return `${weeks}w`;
    }
    return `${d.value} ${d.unit === DurationUnit.MINUTES ? 'min' : d.unit === DurationUnit.HOURS ? 'hr' : d.unit === DurationUnit.DAYS ? 'days' : 'wks'}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const isTomorrow = new Date(today.getTime() + 86400000).getDate() === date.getDate() && date.getMonth() === new Date(today.getTime() + 86400000).getMonth();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.dueDate && task.dueDate < Date.now() && !task.completed;

  return (
    <div className={`group bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300 ${task.completed ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-700'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5 flex-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              task.completed ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
            }`}
          >
            {task.completed && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 transition-all ${task.completed ? 'line-through text-slate-400 dark:text-slate-500 decoration-slate-400' : ''}`}>
              {task.title}
            </h3>
            
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyles(task.priority)} uppercase tracking-wider`}>
                {task.priority}
              </span>
              
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                {task.type === TaskType.DAILY ? <Clock size={10} /> : <Calendar size={10} />}
                {formatDurationSmart(task.duration)}
              </span>

              {task.dueDate && (
                 <span className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                    <CalendarClock size={10} />
                    {isOverdue ? 'Overdue: ' : ''}{formatDate(task.dueDate)}
                 </span>
              )}
              
              {timeLeft && !task.completed && !isOverdue && (
                  <span className="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30 font-medium">
                      <Timer size={10} />
                      {timeLeft}
                  </span>
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setExpanded(!expanded)} 
          className={`text-slate-400 dark:text-slate-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${expanded ? 'bg-slate-100 dark:bg-slate-800 text-indigo-500' : ''}`}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded Subtasks View */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in-down">
          {task.description && (
             <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-50 dark:border-slate-800">
               {task.description}
             </p>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-bold uppercase tracking-wider pl-1">Checklist</p>
              <ul className="space-y-2">
                {task.subtasks.map((st) => (
                  <li key={st.id} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-800/20 p-2 rounded-lg">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${task.completed ? 'bg-slate-300' : 'bg-indigo-400'}`}></div>
                    <span className={task.completed ? 'opacity-50' : ''}>{st.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
             <button 
              onClick={() => onEdit(task)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Pencil size={14} /> Edit Task
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;