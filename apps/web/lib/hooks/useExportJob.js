'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing background export jobs
 * 
 * Usage:
 * const { queueExport, jobStatus, isExporting, cancelExport } = useExportJob();
 * 
 * // Queue a background export
 * const jobId = await queueExport({
 *   sourceType: 'group',
 *   sourceId: groupId,
 *   playlistId: 'all',
 *   name: 'My Playlist'
 * });
 * 
 * // Job status will auto-update via polling
 * console.log(jobStatus); // { id, status, progress, currentStep, ... }
 */
export function useExportJob(options = {}) {
  const { pollInterval = 2000, autoPoll = true } = options;
  
  const [jobStatus, setJobStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const response = await fetch(`/api/export-jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      
      const { job } = await response.json();
      setJobStatus(job);
      
      // Stop polling if job is complete
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        stopPolling();
        setIsExporting(false);
      }
      
      return job;
    } catch (err) {
      console.error('[useExportJob] Error polling status:', err);
      setError(err.message);
      return null;
    }
  }, [stopPolling]);

  // Start polling for a job
  const startPolling = useCallback((jobId) => {
    stopPolling(); // Clear any existing poll
    
    // Immediate first poll
    pollJobStatus(jobId);
    
    // Set up interval
    pollRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, pollInterval);
  }, [pollInterval, pollJobStatus, stopPolling]);

  // Queue a new export job
  const queueExport = useCallback(async (params) => {
    setError(null);
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/export-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to queue export');
      }
      
      setJobStatus({
        id: data.job.id,
        status: data.job.status,
        current_step: data.job.currentStep,
        progress: 0
      });
      
      // Start polling for updates
      if (autoPoll) {
        startPolling(data.job.id);
      }
      
      return data.job.id;
    } catch (err) {
      setError(err.message);
      setIsExporting(false);
      throw err;
    }
  }, [autoPoll, startPolling]);

  // Cancel current job
  const cancelExport = useCallback(async () => {
    if (!jobStatus?.id) return;
    
    try {
      const response = await fetch(`/api/export-jobs/${jobStatus.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        stopPolling();
        setJobStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
        setIsExporting(false);
      }
    } catch (err) {
      console.error('[useExportJob] Error cancelling:', err);
    }
  }, [jobStatus?.id, stopPolling]);

  // Get list of user's recent jobs
  const getRecentJobs = useCallback(async (limit = 10) => {
    try {
      const response = await fetch(`/api/export-jobs?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const { jobs } = await response.json();
      return jobs;
    } catch (err) {
      console.error('[useExportJob] Error fetching jobs:', err);
      return [];
    }
  }, []);

  // Resume monitoring an existing job
  const resumeMonitoring = useCallback((jobId) => {
    setIsExporting(true);
    startPolling(jobId);
  }, [startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // State
    jobStatus,
    isExporting,
    error,
    
    // Actions
    queueExport,
    cancelExport,
    getRecentJobs,
    resumeMonitoring,
    pollJobStatus,
    
    // Computed
    isComplete: jobStatus?.status === 'completed',
    isFailed: jobStatus?.status === 'failed',
    isCancelled: jobStatus?.status === 'cancelled',
    progress: jobStatus?.progress || 0,
    currentStep: jobStatus?.current_step || '',
    // Support both old and new field names
    externalUrl: jobStatus?.external_playlist_url || jobStatus?.spotify_playlist_url,
    spotifyUrl: jobStatus?.external_playlist_url || jobStatus?.spotify_playlist_url,
    platform: jobStatus?.platform || 'spotify'
  };
}

/**
 * Helper to determine if a playlist should use background export
 * Based on estimated track count
 */
export function shouldUseBackgroundExport(trackCount, threshold = 200) {
  return trackCount > threshold;
}

