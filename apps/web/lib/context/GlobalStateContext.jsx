'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

// Types of tasks that can have progress
const TASK_TYPES = {
  SORT: 'sort',
  IMPORT: 'import',
};

// Max number of concurrent tasks to show
const MAX_TASKS = 5;

const GlobalStateContext = createContext(null);

export function GlobalStateProvider({ children }) {
  // Active tasks with progress - use ref for interval-based updates to avoid re-renders
  const [activeTasks, setActiveTasks] = useState([]);
  const tasksRef = useRef([]);
  
  // Currently playing song (for persistent miniplayer) - just one song, last selected
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  
  // Song queue for autoplay next (array of songs from the group)
  const [songQueue, setSongQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  
  // Keep ref in sync
  tasksRef.current = activeTasks;
  
  // Start a new task with progress tracking
  const startTask = useCallback((taskId, type, title, groupName = null) => {
    setActiveTasks(prev => {
      // Remove any existing task with same ID
      let filtered = prev.filter(t => t.id !== taskId);
      
      // If we already have max tasks, remove the oldest completed one or oldest running one
      if (filtered.length >= MAX_TASKS) {
        // First try to remove completed/failed tasks
        const completedIndex = filtered.findIndex(t => t.status !== 'running');
        if (completedIndex !== -1) {
          filtered = [...filtered.slice(0, completedIndex), ...filtered.slice(completedIndex + 1)];
        } else {
          // Remove oldest running task
          filtered = filtered.slice(1);
        }
      }
      
      return [...filtered, {
        id: taskId,
        type,
        title,
        groupName,
        progress: 0,
        status: 'running',
        startTime: Date.now(),
        estimatedTime: null,
        message: 'Starting...',
      }];
    });
  }, []);
  
  // Update task progress - optimized to batch updates
  const updateTaskProgress = useCallback((taskId, progress, message = null, estimatedTime = null) => {
    setActiveTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;
      
      const task = prev[taskIndex];
      // Skip update if values haven't changed significantly (reduce re-renders)
      if (
        Math.abs(task.progress - progress) < 2 && 
        task.message === message &&
        task.estimatedTime === estimatedTime
      ) {
        return prev;
      }
      
      const newTasks = [...prev];
      newTasks[taskIndex] = {
        ...task,
        progress: Math.min(100, Math.max(0, progress)),
        message: message || task.message,
        estimatedTime: estimatedTime !== null ? estimatedTime : task.estimatedTime,
      };
      return newTasks;
    });
  }, []);
  
  // Complete a task
  const completeTask = useCallback((taskId, success = true, message = null) => {
    setActiveTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;
      
      const newTasks = [...prev];
      newTasks[taskIndex] = {
        ...newTasks[taskIndex],
        progress: 100,
        status: success ? 'completed' : 'failed',
        message: message || (success ? 'Completed!' : 'Failed'),
      };
      return newTasks;
    });
    
    // Remove completed tasks after a delay
    setTimeout(() => {
      setActiveTasks(prev => prev.filter(t => t.id !== taskId));
    }, 3000);
  }, []);
  
  // Cancel/remove a task
  const cancelTask = useCallback((taskId) => {
    setActiveTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);
  
  // Play a song with optional queue - always replaces current song
  const playSong = useCallback((song, queue = null, queueIndex = -1) => {
    setCurrentlyPlaying(song);
    if (queue && queue.length > 0) {
      setSongQueue(queue);
      setCurrentQueueIndex(queueIndex >= 0 ? queueIndex : queue.findIndex(s => s.id === song.id));
    }
  }, []);
  
  // Play next song in queue
  const playNext = useCallback(() => {
    if (songQueue.length === 0 || currentQueueIndex < 0) return false;
    
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= songQueue.length) {
      // End of queue
      return false;
    }
    
    const nextSong = songQueue[nextIndex];
    setCurrentlyPlaying(nextSong);
    setCurrentQueueIndex(nextIndex);
    return true;
  }, [songQueue, currentQueueIndex]);
  
  // Play previous song in queue
  const playPrevious = useCallback(() => {
    if (songQueue.length === 0 || currentQueueIndex <= 0) return false;
    
    const prevIndex = currentQueueIndex - 1;
    const prevSong = songQueue[prevIndex];
    setCurrentlyPlaying(prevSong);
    setCurrentQueueIndex(prevIndex);
    return true;
  }, [songQueue, currentQueueIndex]);
  
  // Stop playing and clear queue
  const stopPlaying = useCallback(() => {
    setCurrentlyPlaying(null);
    setSongQueue([]);
    setCurrentQueueIndex(-1);
  }, []);
  
  // Check if there's a next/previous song
  const hasNext = songQueue.length > 0 && currentQueueIndex < songQueue.length - 1;
  const hasPrevious = songQueue.length > 0 && currentQueueIndex > 0;
  
  // Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // Tasks
    activeTasks,
    hasActiveTasks: activeTasks.some(t => t.status === 'running'),
    startTask,
    updateTaskProgress,
    completeTask,
    cancelTask,
    TASK_TYPES,
    
    // Miniplayer
    currentlyPlaying,
    songQueue,
    currentQueueIndex,
    hasNext,
    hasPrevious,
    playSong,
    playNext,
    playPrevious,
    stopPlaying,
  }), [activeTasks, currentlyPlaying, songQueue, currentQueueIndex, hasNext, hasPrevious, startTask, updateTaskProgress, completeTask, cancelTask, playSong, playNext, playPrevious, stopPlaying]);
  
  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
}

// Hook specifically for progress tasks
export function useProgressTasks() {
  const { activeTasks, hasActiveTasks, startTask, updateTaskProgress, completeTask, cancelTask, TASK_TYPES } = useGlobalState();
  return { activeTasks, hasActiveTasks, startTask, updateTaskProgress, completeTask, cancelTask, TASK_TYPES };
}

// Hook specifically for miniplayer
export function useMiniplayer() {
  const { currentlyPlaying, songQueue, currentQueueIndex, hasNext, hasPrevious, playSong, playNext, playPrevious, stopPlaying } = useGlobalState();
  return { currentlyPlaying, songQueue, currentQueueIndex, hasNext, hasPrevious, playSong, playNext, playPrevious, stopPlaying };
}
