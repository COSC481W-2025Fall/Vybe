'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw, Download, Upload } from 'lucide-react';
import {
  detectConflict,
  formatConflictForDisplay,
  resolveConflict,
  ConflictResolutionStrategy,
  analyzeDataLoss,
} from '@/lib/utils/settingsConflictResolver';

/**
 * Settings Conflict Dialog Component
 * 
 * Displays a dialog when settings conflicts are detected, allowing the user to:
 * - See what changed locally vs remotely
 * - Choose which version to keep (local or remote)
 * - See a preview of conflicts
 * - Prevent data loss
 */
export default function SettingsConflictDialog({
  isOpen,
  onClose,
  type,
  localData,
  remoteData,
  onResolve,
  strategy = ConflictResolutionStrategy.USER_CHOICE,
}) {
  const [userChoice, setUserChoice] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [formattedConflict, setFormattedConflict] = useState(null);
  const [dataLossAnalysis, setDataLossAnalysis] = useState(null);

  // Detect and analyze conflict when dialog opens
  useEffect(() => {
    if (isOpen && localData && remoteData) {
      const conflict = detectConflict(type, localData, remoteData);
      const formatted = formatConflictForDisplay(type, conflict);
      const localLoss = analyzeDataLoss(type, localData, remoteData, ConflictResolutionStrategy.REMOTE);
      const remoteLoss = analyzeDataLoss(type, localData, remoteData, ConflictResolutionStrategy.LOCAL);

      setConflictInfo(conflict);
      setFormattedConflict(formatted);
      setDataLossAnalysis({
        local: localLoss,
        remote: remoteLoss,
      });
      setUserChoice(null);
    }
  }, [isOpen, type, localData, remoteData]);

  if (!isOpen || !conflictInfo || !formattedConflict) {
    return null;
  }

  const handleResolve = (choice) => {
    const resolution = resolveConflict(type, localData, remoteData, strategy, choice);
    onResolve(resolution.resolved, choice);
    onClose();
  };

  const handleKeepLocal = () => {
    handleResolve('local');
  };

  const handleKeepRemote = () => {
    handleResolve('remote');
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">(empty)</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm [data-theme='light']:bg-black/40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/20 glass-card shadow-2xl [data-theme='light']:border-black/20">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 glass-card px-6 py-4 [data-theme='light']:border-black/10">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Settings Conflict Detected</h2>
              <p className="text-sm text-[var(--muted-foreground)]">{formattedConflict.typeLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-200">
              Your settings were modified on another device or tab. Please choose which version to keep.
            </p>
          </div>

          {/* Conflict Summary */}
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">Conflict Summary</h3>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4 [data-theme='light']:bg-black/5 [data-theme='light']:border-black/10">
              <p className="text-sm text-[var(--foreground)]">
                {formattedConflict.conflictingFieldsCount > 0
                  ? `${formattedConflict.conflictingFieldsCount} field${formattedConflict.conflictingFieldsCount > 1 ? 's' : ''} have conflicting values`
                  : 'No direct conflicts, but changes exist in both versions'}
              </p>
            </div>
          </div>

          {/* Conflict Details */}
          {conflictInfo.conflictingFields.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">Conflicting Fields</h3>
              <div className="space-y-3">
                {conflictInfo.conflictingFields.map((field, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/10 bg-white/5 p-4 [data-theme='light']:bg-black/5 [data-theme='light']:border-black/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--foreground)] capitalize">
                        {field.field.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {/* Local Value */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Upload className="h-4 w-4 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">Your Local Changes</span>
                        </div>
                        <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2">
                          <code className="text-xs text-blue-200 break-all">
                            {formatValue(field.local)}
                          </code>
                        </div>
                      </div>

                      {/* Remote Value */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Download className="h-4 w-4 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">Remote Changes</span>
                        </div>
                        <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2">
                          <code className="text-xs text-purple-200 break-all">
                            {formatValue(field.remote)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Loss Warnings */}
          {dataLossAnalysis && (
            <div className="space-y-3">
              {dataLossAnalysis.local.willLoseData && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-300">
                    ⚠️ Keeping remote version will lose {dataLossAnalysis.local.lostFieldsCount} local change{dataLossAnalysis.local.lostFieldsCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {dataLossAnalysis.remote.willLoseData && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-300">
                    ⚠️ Keeping local version will lose {dataLossAnalysis.remote.lostFieldsCount} remote change{dataLossAnalysis.remote.lostFieldsCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 [data-theme='light']:border-black/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleKeepLocal}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:text-blue-300 transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Keep Local Changes
            </button>
            <button
              onClick={handleKeepRemote}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:text-purple-300 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Keep Remote Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





