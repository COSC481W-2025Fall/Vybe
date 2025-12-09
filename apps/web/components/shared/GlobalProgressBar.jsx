'use client';

import { memo } from 'react';
import { useProgressTasks } from '@/lib/context/GlobalStateContext';
import { Sparkles, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function GlobalProgressBar() {
  const { activeTasks, cancelTask } = useProgressTasks();
  
  // Only show running or recently completed tasks (max 5 already enforced by context)
  const visibleTasks = activeTasks.filter(t => t.status === 'running' || t.status === 'completed' || t.status === 'failed');
  
  if (visibleTasks.length === 0) return null;
  
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40 flex flex-col gap-2 sm:w-80 pointer-events-none">
      {visibleTasks.map(task => (
        <TaskProgressCard key={task.id} task={task} onCancel={() => cancelTask(task.id)} />
      ))}
    </div>
  );
}

const TaskProgressCard = memo(function TaskProgressCard({ task, onCancel }) {
  const isSort = task.type === 'sort';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const isRunning = task.status === 'running';
  
  const bgGradient = isSort 
    ? 'from-[var(--accent)] to-pink-600' 
    : 'from-blue-600 to-cyan-600';
  
  return (
    <div 
      className={`glass-card rounded-xl p-3 sm:p-4 border shadow-lg animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto ${
        isCompleted ? 'border-green-500/50' : isFailed ? 'border-red-500/50' : 'border-[var(--glass-border)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-r ${bgGradient}`}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : isCompleted ? (
              <CheckCircle className="h-4 w-4 text-white" />
            ) : (
              <AlertCircle className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {task.title}
            </p>
            {task.groupName && (
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                {task.groupName}
              </p>
            )}
          </div>
        </div>
        
        {isRunning && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-[var(--secondary-hover)] rounded transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        )}
      </div>
      
      {/* Progress bar */}
      {isRunning && (
        <div className="mb-2">
          <div className="h-1.5 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${bgGradient} rounded-full transition-all duration-150 ease-out`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Status message */}
      <div className="flex items-center justify-between text-xs">
        <span className={`${
          isCompleted ? 'text-green-500' : isFailed ? 'text-red-500' : 'text-[var(--muted-foreground)]'
        }`}>
          {task.message}
        </span>
        {isRunning && task.progress > 0 && (
          <span className="text-[var(--muted-foreground)]">
            {task.progress}%
            {task.estimatedTime > 0 && ` • ~${task.estimatedTime}s`}
          </span>
        )}
      </div>
    </div>
  );
});

export default memo(GlobalProgressBar);
