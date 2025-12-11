'use client';

import { memo } from 'react';
import { useProgressTasks } from '@/lib/context/GlobalStateContext';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function GlobalProgressBar() {
  const { activeTasks, cancelTask } = useProgressTasks();
  
  // Only show running or recently completed tasks (max 5 already enforced by context)
  // Filter out export tasks that run in background (they use toast notifications instead)
  const visibleTasks = activeTasks.filter(t => 
    (t.status === 'running' || t.status === 'completed' || t.status === 'failed') &&
    t.type !== 'export' // Don't show background exports here
  );
  
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
  
  // Determine border color based on status
  const borderColor = isCompleted 
    ? 'border-green-500/50' 
    : isFailed 
      ? 'border-red-500/50' 
      : 'border-white/10 [data-theme="light"]:border-black/10';
  
  return (
    <div 
      className={`rounded-xl p-3 sm:p-4 border shadow-lg animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto ${borderColor}`}
      style={{
        // Liquid glass effect - matching the site's aesthetic
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(var(--accent-rgb), 0.05) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 1px 0 rgba(255, 255, 255, 0.1) inset',
      }}
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
            className="p-1 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 rounded transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        )}
      </div>
      
      {/* Progress bar */}
      {isRunning && (
        <div className="mb-2">
          <div className="h-1.5 bg-white/10 [data-theme='light']:bg-black/10 rounded-full overflow-hidden">
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
          isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-[var(--muted-foreground)]'
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
