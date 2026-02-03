import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layout, 
  Plus, 
  User, 
  Home as HomeIcon, 
  Sparkles, 
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle2,
  PieChart as PieChartIcon,
  LogOut,
  Moon,
  Sun,
  X,
  ListTodo,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Task, TaskType, DurationUnit, Priority, UserProfile, ViewState } from './types';
import TaskCard from './components/TaskCard';
import { generateTaskBreakdown } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// --- Constants ---
const STORAGE_KEY_TASKS = 'taskflow_tasks';
const STORAGE_KEY_PROFILE = 'taskflow_profile';
const STORAGE_KEY_THEME = 'taskflow_theme';

// --- Sub-Components (Internal for simplicity) ---

const BottomNav: React.FC<{ view: ViewState; setView: (v: ViewState) => void }> = ({ view, setView }) => (
  <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 h-20 flex justify-around items-start z-50 max-w-md mx-auto right-0 transition-all duration-300">
    <button 
      onClick={() => setView('HOME')}
      className={`flex flex-col items-center gap-1 transition-colors ${view === 'HOME' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
    >
      <HomeIcon size={24} strokeWidth={view === 'HOME' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">Tasks</span>
    </button>
    
    <button 
      onClick={() => setView('ADD_TASK')}
      className="bg-indigo-600 dark:bg-indigo-500 text-white p-4 rounded-full -mt-6 shadow-xl shadow-indigo-300 dark:shadow-indigo-900/50 hover:scale-105 active:scale-95 transition-all"
    >
      <Plus size={28} />
    </button>
    
    <button 
      onClick={() => setView('PROFILE')}
      className={`flex flex-col items-center gap-1 transition-colors ${view === 'PROFILE' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
    >
      <User size={24} strokeWidth={view === 'PROFILE' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">Profile</span>
    </button>
  </div>
);

// --- Views ---

const OnboardingView: React.FC<{ onComplete: (name: string) => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');
  
  return (
    <div className="h-screen flex flex-col justify-center items-center p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200 dark:shadow-black/20 mb-10 border border-slate-100 dark:border-slate-800 animate-fade-in-up">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 mb-4">
           <CheckCircle2 size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center tracking-tight">TaskFlow</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center text-sm">Organize your life with AI superpowers.</p>
      </div>
      
      <div className="w-full max-w-xs space-y-4 animate-fade-in-up delay-100">
        <div className="text-center">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">How should we greet you?</label>
            <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-2xl border-2 border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 text-center font-medium text-lg transition-all"
            placeholder="Your Name"
            />
        </div>
        <button 
          onClick={() => name && onComplete(name)}
          disabled={!name}
          className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-300 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Get Started <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

const HomeView: React.FC<{ 
  tasks: Task[]; 
  profile: UserProfile; 
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}> = ({ tasks, profile, onToggle, onDelete, onEdit }) => {
  const [activeTab, setActiveTab] = useState<TaskType>(TaskType.DAILY);

  const filteredTasks = tasks.filter(t => t.type === activeTab);
  const progress = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.completed).length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [filteredTasks]);

  // Sort tasks: Incomplete first, then by due date (soonest first), then created date
  const sortedTasks = useMemo(() => {
     return [...filteredTasks].sort((a, b) => {
         if (a.completed === b.completed) {
             if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
             if (a.dueDate) return -1;
             if (b.dueDate) return 1;
             return b.createdAt - a.createdAt;
         }
         return a.completed ? 1 : -1;
     });
  }, [filteredTasks]);

  return (
    <div className="pb-24 pt-8 px-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Good day, {profile.name} 👋</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Tasks</h1>
        </div>
        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm">
          {profile.name.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-600 dark:to-indigo-800 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
            <div>
                <p className="text-indigo-100 font-medium mb-1 text-sm">Daily Progress</p>
                <h2 className="text-4xl font-bold tracking-tight">{progress}%</h2>
            </div>
            <div className="text-right">
                <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">{filteredTasks.filter(t=>t.completed).length}/{filteredTasks.length} Completed</span>
            </div>
            </div>
            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="bg-white h-full transition-all duration-700 ease-out rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl mb-6 backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab(TaskType.DAILY)}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === TaskType.DAILY ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Daily Tasks
        </button>
        <button 
          onClick={() => setActiveTab(TaskType.LONG_TERM)}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === TaskType.LONG_TERM ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Long Term
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-600">
              {activeTab === TaskType.DAILY ? <Clock size={32} /> : <CalendarDays size={32} />}
            </div>
            <h3 className="text-slate-900 dark:text-white font-medium mb-1">No tasks found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tap the + button to create one!</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
};

const TaskFormView: React.FC<{ 
  initialData?: Task;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  onCancel: () => void;
}> = ({ initialData, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState<TaskType>(initialData?.type || TaskType.DAILY);
  const [durationVal, setDurationVal] = useState(initialData?.duration.value || 1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialData?.duration.unit || DurationUnit.HOURS);
  const [priority, setPriority] = useState<Priority>(initialData?.priority || Priority.MEDIUM);
  
  // Subtasks State
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(initialData?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Initialize date string from timestamp
  const initialDateStr = useMemo(() => {
    if (!initialData?.dueDate) return '';
    const date = new Date(initialData.dueDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [initialData]);

  const [dueDate, setDueDate] = useState(initialDateStr);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleTypeChange = (newType: TaskType) => {
      setType(newType);
      if (newType === TaskType.DAILY) {
          setDurationUnit(DurationUnit.HOURS);
          setDurationVal(1);
      } else {
          setDurationUnit(DurationUnit.WEEKS);
          setDurationVal(1);
      }
  };

  // Improved conversion logic
  const handleUnitChange = (newUnit: DurationUnit) => {
    if (durationUnit === newUnit) return;
    
    let newVal = durationVal;
    
    // Helper to format nicely
    const fmt = (num: number) => parseFloat(num.toFixed(2));

    // Minutes <-> Hours
    if (durationUnit === DurationUnit.MINUTES && newUnit === DurationUnit.HOURS) {
        newVal = fmt(durationVal / 60);
    } else if (durationUnit === DurationUnit.HOURS && newUnit === DurationUnit.MINUTES) {
        newVal = Math.round(durationVal * 60);
    }
    // Days <-> Weeks
    else if (durationUnit === DurationUnit.DAYS && newUnit === DurationUnit.WEEKS) {
        newVal = fmt(durationVal / 7);
    } else if (durationUnit === DurationUnit.WEEKS && newUnit === DurationUnit.DAYS) {
        newVal = Math.round(durationVal * 7);
    } 
    // Cross conversion fallback (e.g. Hours -> Days)
    else if (durationUnit === DurationUnit.HOURS && newUnit === DurationUnit.DAYS) {
        newVal = fmt(durationVal / 24);
    } else if (durationUnit === DurationUnit.DAYS && newUnit === DurationUnit.HOURS) {
        newVal = Math.round(durationVal * 24);
    }
    
    setDurationUnit(newUnit);
    setDurationVal(newVal);
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      title: newSubtask.trim(),
      completed: false
    }]);
    setNewSubtask('');
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubmit = () => {
    if (!title) return;
    
    let timestamp: number | undefined = undefined;
    if (dueDate) {
        const [year, month, day] = dueDate.split('-').map(Number);
        // Set time to end of day (23:59:59) so it's not overdue during the day
        timestamp = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    }

    onSubmit({
      title,
      description,
      type,
      duration: { value: durationVal, unit: durationUnit },
      priority,
      dueDate: timestamp,
      subtasks
    });
  };

  const handleMagicFill = async () => {
    if (!title) {
        setAiError("Please enter a task title first.");
        return;
    }
    setAiError(null);
    setIsAiLoading(true);
    try {
      const result = await generateTaskBreakdown(title, type);
      if (result) {
        setTitle(result.title);
        setDescription(result.description || '');
        setPriority(result.priority);
        setDurationVal(result.duration.value);
        setDurationUnit(result.duration.unit);
        if (result.substeps && result.substeps.length > 0) {
            const aiSubtasks = result.substeps.map((step, idx) => ({
              id: (Date.now() + idx).toString(),
              title: step,
              completed: false
            }));
            setSubtasks(aiSubtasks);
        }
      }
    } catch (err) {
      setAiError("Failed to generate plan. Try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const isEditing = !!initialData;

  const openDatePicker = () => {
    const element = dateInputRef.current;
    if (element) {
        if (typeof (element as any).showPicker === 'function') {
            try {
                (element as any).showPicker();
            } catch (e) {
                element.focus();
            }
        } else {
            element.focus();
            element.click();
        }
    }
  };

  return (
    <div className="p-6 pb-24 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isEditing ? 'Edit Task' : 'New Task'}</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">What needs to be done?</label>
          <div className="relative">
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Learn React Native"
              className="w-full p-4 pr-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 dark:text-white dark:placeholder-slate-600 shadow-sm transition-all"
            />
            <button 
              onClick={handleMagicFill}
              disabled={isAiLoading || !title}
              className={`absolute right-3 top-3 p-2 rounded-xl transition-all ${isAiLoading ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105'}`}
            >
              <Sparkles size={18} className={isAiLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {aiError && <p className="text-red-500 text-xs mt-2 ml-1">{aiError}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1 flex items-center gap-1">
             <Sparkles size={12} className="text-indigo-500" /> Auto-fill details using AI
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Type</label>
          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={() => handleTypeChange(TaskType.DAILY)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200 ${type === TaskType.DAILY ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'}`}
             >
                <Clock className={type === TaskType.DAILY ? 'animate-pulse' : ''} />
                <span className="font-semibold text-sm">Daily</span>
             </button>
             <button 
              onClick={() => handleTypeChange(TaskType.LONG_TERM)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200 ${type === TaskType.LONG_TERM ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'}`}
             >
                <CalendarDays className={type === TaskType.LONG_TERM ? 'animate-pulse' : ''} />
                <span className="font-semibold text-sm">Long Term</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Due Date <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div 
                className="relative w-full cursor-pointer group" 
                onClick={openDatePicker}
            >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none">
                    <CalendarIcon size={20} />
                </div>
                <input 
                    ref={dateInputRef}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-4 pl-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm cursor-pointer appearance-none min-h-[58px]"
                />
            </div>
            </div>

            <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Estimated Duration</label>
            <div className="flex gap-3">
                <input 
                type="number"
                min="0.1"
                step="0.1"
                value={durationVal}
                onChange={(e) => setDurationVal(parseFloat(e.target.value) || 0)}
                className="w-24 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm"
                />
                <div className="flex-1 flex bg-slate-200/50 dark:bg-slate-800 rounded-2xl p-1">
                {type === TaskType.DAILY ? (
                    <>
                        <button onClick={() => handleUnitChange(DurationUnit.MINUTES)} className={`flex-1 rounded-xl text-sm font-medium transition-all ${durationUnit === DurationUnit.MINUTES ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Min</button>
                        <button onClick={() => handleUnitChange(DurationUnit.HOURS)} className={`flex-1 rounded-xl text-sm font-medium transition-all ${durationUnit === DurationUnit.HOURS ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Hours</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => handleUnitChange(DurationUnit.DAYS)} className={`flex-1 rounded-xl text-sm font-medium transition-all ${durationUnit === DurationUnit.DAYS ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Days</button>
                        <button onClick={() => handleUnitChange(DurationUnit.WEEKS)} className={`flex-1 rounded-xl text-sm font-medium transition-all ${durationUnit === DurationUnit.WEEKS ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Weeks</button>
                    </>
                )}
                </div>
            </div>
            </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
          <div className="flex gap-3">
            {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-3 rounded-2xl border text-sm font-bold capitalize transition-all ${priority === p ? 
                  (p === Priority.HIGH ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-400 shadow-sm' : p === Priority.MEDIUM ? 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/20 dark:border-amber-500/50 dark:text-amber-400 shadow-sm' : 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-500/50 dark:text-emerald-400 shadow-sm') 
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        
        {/* Subtasks Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <ListTodo size={18} className="text-indigo-500" /> Checklist / Subtasks
          </label>
          
          <div className="flex gap-2 mb-3">
             <input 
                type="text" 
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="Add a step..."
                className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white dark:placeholder-slate-500 text-sm"
             />
             <button 
                onClick={handleAddSubtask}
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
             >
                <Plus size={20} />
             </button>
          </div>

          {subtasks.length > 0 ? (
             <div className="space-y-2">
                {subtasks.map((st) => (
                   <div key={st.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                         <span className="text-sm text-slate-700 dark:text-slate-300">{st.title}</span>
                      </div>
                      <button 
                         onClick={() => handleDeleteSubtask(st.id)}
                         className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                         <X size={16} />
                      </button>
                   </div>
                ))}
             </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2 italic">No subtasks added yet</p>
          )}
        </div>

        <div>
           <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
           <textarea 
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 min-h-[100px] text-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm"
             placeholder="Add any additional details here..."
           />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-300 dark:shadow-indigo-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {isEditing ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ 
    profile: UserProfile; 
    tasks: Task[];
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}> = ({ profile, tasks, onLogout, isDarkMode, toggleTheme }) => {

  const data = useMemo(() => {
    const daily = tasks.filter(t => t.type === TaskType.DAILY).length;
    const longTerm = tasks.filter(t => t.type === TaskType.LONG_TERM).length;
    return [
      { name: 'Daily', value: daily },
      { name: 'Long Term', value: longTerm },
    ];
  }, [tasks]);

  const COLORS = ['#6366f1', '#ec4899']; // Indigo, Pink

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="pb-24 pt-8 px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Your Profile</h1>
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-10 dark:opacity-20"></div>
        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 shadow-lg z-10 border-4 border-slate-50 dark:border-slate-900">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white z-10">{profile.name}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm z-10">Productivity Enthusiast</p>
      </div>

      {/* Theme Toggle */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-500'}`}>
                 {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
             </div>
             <span className="font-semibold text-slate-700 dark:text-slate-200">Dark Mode</span>
         </div>
         <button 
            onClick={toggleTheme} 
            className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
         >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-1 transition-all duration-300 flex items-center justify-center ${isDarkMode ? 'left-7' : 'left-1'}`}>
            </div>
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <PieChartIcon size={20} className="text-indigo-500"/>
          Task Distribution
        </h3>
        <div className="h-48 w-full">
            {tasks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000' }} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <PieChartIcon size={32} className="mb-2 opacity-20" />
                    No data yet
                </div>
            )}
        </div>
        <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-[#6366f1]"></div> Daily
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-[#ec4899]"></div> Long Term
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
            <h4 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{tasks.length}</h4>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Tasks</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
            <h4 className="text-3xl font-bold text-emerald-500 dark:text-emerald-400 mb-1">{completedCount}</h4>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Completed</p>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
      >
        <LogOut size={20} />
        Reset Profile
      </button>

    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('HOME');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Load Initial State
  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedTheme) setDarkMode(JSON.parse(savedTheme));
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
       setDarkMode(true);
    }
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY_PROFILE);
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleOnboarding = (name: string) => {
    setProfile({ name, onboarded: true });
    setView('HOME');
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    if (editingTask) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
        setEditingTask(null);
    } else {
        const newTask: Task = {
            ...taskData,
            id: Date.now().toString(),
            createdAt: Date.now(),
            completed: false,
        };
        setTasks(prev => [newTask, ...prev]);
    }
    setView('HOME');
  };

  const handleEditTask = (task: Task) => {
      setEditingTask(task);
      setView('EDIT_TASK');
  }

  const handleCancelEdit = () => {
      setEditingTask(null);
      setView('HOME');
  }

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleLogout = () => {
    setProfile(null);
    setTasks([]);
    localStorage.removeItem(STORAGE_KEY_TASKS);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center transition-colors duration-500">
        {/* Container simulating Mobile Viewport */}
        <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 min-h-screen relative shadow-2xl overflow-hidden flex flex-col transition-colors duration-500">
          
          {!profile ? (
             <OnboardingView onComplete={handleOnboarding} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {view === 'HOME' && (
                  <HomeView 
                    tasks={tasks} 
                    profile={profile} 
                    onToggle={handleToggleTask} 
                    onDelete={handleDeleteTask}
                    onEdit={handleEditTask}
                  />
                )}
                {(view === 'ADD_TASK' || view === 'EDIT_TASK') && (
                  <TaskFormView 
                    initialData={view === 'EDIT_TASK' ? (editingTask || undefined) : undefined}
                    onSubmit={handleSaveTask} 
                    onCancel={handleCancelEdit} 
                  />
                )}
                {view === 'PROFILE' && (
                  <ProfileView 
                    profile={profile} 
                    tasks={tasks} 
                    onLogout={handleLogout} 
                    isDarkMode={darkMode}
                    toggleTheme={toggleTheme}
                  />
                )}
              </div>

              {view !== 'ADD_TASK' && view !== 'EDIT_TASK' && <BottomNav view={view} setView={setView} />}
            </>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default App;