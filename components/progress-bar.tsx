/**
 * ProgressBar Component
 * Animated progress bar with multiple states and time estimation
 */
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Cog, 
  Upload,
  Clock,
  Download,
  HardDrive,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/hooks/use-app-state';
import { useProcessing } from '@/hooks/use-processing';
import { useGoogleDrive } from '@/hooks/use-google-drive';
import { DriveUploadProgress } from './drive-upload-progress';
import type { ProgressBarProps, ProgressState } from '@/types/ui';

/**
 * Formats time in seconds to human readable format
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Gets icon and color scheme for each progress state
 */
const getStateConfig = (state: ProgressState) => {
  const configs = {
    idle: {
      icon: null,
      color: 'text-slate-400',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
    },
    analyzing: {
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    processing: {
      icon: Cog,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary-light',
      borderColor: 'border-brand-primary',
    },
    uploading: {
      icon: Upload,
      color: 'text-brand-accent',
      bgColor: 'bg-brand-accent-light',
      borderColor: 'border-brand-accent',
    },
    complete: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-status-success',
      borderColor: 'border-status-success-border',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-status-error',
      borderColor: 'border-status-error-border',
    },
  };

  return configs[state];
};

/**
 * Gets contextual messages based on state and strategy
 */
const getContextualMessage = (state: ProgressState, percentage: number, strategy?: string): string => {
  switch (state) {
    case 'idle':
      return 'Ready to process your ZIP file';
    
    case 'analyzing':
      return 'Analyzing ZIP file structure and contents...';
    
    case 'processing':
      if (strategy === 'CLIENT_SIDE') {
        if (percentage < 25) return 'Extracting and analyzing file contents...';
        if (percentage < 50) return 'Optimizing file distribution...';
        if (percentage < 75) return 'Creating split archives...';
        return 'Finalizing split files...';
      } else {
        if (percentage < 30) return 'Preparing files for Google Drive...';
        if (percentage < 60) return 'Optimizing for cloud storage...';
        return 'Creating shareable archives...';
      }
    
    case 'uploading':
      if (percentage < 50) return 'Uploading to Google Drive...';
      return 'Generating shareable links...';
    
    case 'complete':
      return strategy === 'CLIENT_SIDE' 
        ? 'Files split successfully! Ready for download.' 
        : 'Files uploaded to Google Drive! Links are ready.';
    
    case 'error':
      return 'An error occurred during processing. Please try again.';
    
    default:
      return 'Processing...';
  }
};

interface ProgressBarComponentProps {
  className?: string;
}

export function ProgressBar({ className }: ProgressBarComponentProps) {
  const { state } = useAppState();
  const { startProcessing, startDownload, canStartProcessing, isProcessing } = useProcessing();
  const { uploadProgress, totalUploadProgress } = useGoogleDrive();
  const [displayPercentage, setDisplayPercentage] = useState(0);

  // Map app status to progress state
  const progressState: ProgressState = state.status === 'idle' ? 'idle' :
                                      state.status === 'analyzing' ? 'analyzing' :
                                      state.status === 'processing' ? 'processing' :
                                      state.status === 'uploading' ? 'uploading' :
                                      state.status === 'downloading' ? 'uploading' :
                                      state.status === 'complete' ? 'complete' :
                                      state.status === 'error' ? 'error' : 'idle';

  const config = getStateConfig(progressState);
  const contextualMessage = state.progress.message || getContextualMessage(
    progressState, 
    state.progress.overall, 
    state.selectedStrategy?.type
  );
  const IconComponent = config.icon;

  // Smooth percentage animation - use Google Drive progress when uploading
  useEffect(() => {
    if (progressState === 'idle') {
      setDisplayPercentage(0);
      return;
    }

    let targetPercentage = state.progress.overall;
    
    // Use Google Drive upload progress when uploading to Drive
    if (progressState === 'uploading' && state.selectedStrategy?.type === 'CLIENT_DRIVE' && uploadProgress.length > 0) {
      targetPercentage = totalUploadProgress;
    }

    const timer = setTimeout(() => {
      setDisplayPercentage(targetPercentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [state.progress.overall, progressState, totalUploadProgress, uploadProgress.length, state.selectedStrategy]);

  // Show progress only when there's a file and some activity
  if (progressState === 'idle' || !state.currentFile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      <Card className={`${config.borderColor} ${config.bgColor} border`}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AnimatePresence mode="wait">
                {IconComponent && (
                  <motion.div
                    key={progressState}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className={`
                      flex h-8 w-8 items-center justify-center rounded-full 
                      ${config.color}
                      ${progressState === 'processing' || progressState === 'analyzing' ? 'animate-spin' : ''}
                    `}
                  >
                    <IconComponent className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {progressState.charAt(0).toUpperCase() + progressState.slice(1).replace('_', ' ')}
                </h3>
                {state.selectedStrategy && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {state.selectedStrategy.type === 'CLIENT_SIDE' ? 'Client-side processing' : 'Google Drive integration'}
                  </p>
                )}
              </div>
            </div>

            {/* Time Estimation */}
            {state.progress.estimatedTimeLeft > 0 && progressState !== 'complete' && progressState !== 'error' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400"
              >
                <Clock className="h-4 w-4" />
                <span>{formatTime(state.progress.estimatedTimeLeft)}</span>
              </motion.div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {contextualMessage}
              </p>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {Math.round(displayPercentage)}%
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={displayPercentage} 
                className="h-3 transition-all duration-300"
              />
              
              {/* Animated shimmer effect for processing states */}
              {(progressState === 'processing' || progressState === 'analyzing' || progressState === 'uploading') && (
                <motion.div
                  className="absolute inset-0 rounded-full opacity-30"
                  animate={{
                    background: [
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                    ],
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <AnimatePresence>
            {progressState === 'idle' && canStartProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  {state.selectedStrategy?.type === 'CLIENT_SIDE' ? (
                    <>
                      <Zap className="h-4 w-4 text-brand-primary" />
                      <span>Ready for lightning-fast processing</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-4 w-4 text-brand-accent" />
                      <span>Ready for Google Drive integration</span>
                    </>
                  )}
                </div>
                <Button
                  onClick={startProcessing}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-brand-primary hover:bg-brand-primary-hover"
                >
                  Start Processing
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success/Error Additional Info */}
          <AnimatePresence>
            {progressState === 'complete' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 space-y-3"
              >
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800">
                    🎉 Processing completed successfully! 
                    {state.selectedStrategy?.type === 'CLIENT_SIDE' && ' Your files are ready for download.'}
                    {state.selectedStrategy?.type === 'CLIENT_DRIVE' && ' Check your Google Drive for the split files.'}
                  </p>
                </div>
                
                {state.fragments && state.fragments.length > 0 && state.selectedStrategy?.type === 'CLIENT_SIDE' && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      {state.fragments.length} fragment{state.fragments.length !== 1 ? 's' : ''} created
                    </div>
                    <Button
                      onClick={startDownload}
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  </div>
                )}

                {state.googleDriveData && state.selectedStrategy?.type === 'CLIENT_DRIVE' && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Files uploaded to Google Drive
                    </div>
                    <Button
                      onClick={() => window.open(state.googleDriveData?.shareUrl, '_blank')}
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <HardDrive className="h-4 w-4 mr-2" />
                      View in Drive
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {progressState === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200"
              >
                <p className="text-sm text-red-800 mb-2">
                  ❌ {state.error?.message || 'Processing failed. Please check your file and try again.'}
                </p>
                {state.error?.suggestedAction && (
                  <p className="text-xs text-red-600">
                    💡 {state.error.suggestedAction}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
      
      {/* Google Drive Upload Progress - show detailed upload progress when uploading to Drive */}
      <AnimatePresence>
        {progressState === 'uploading' && 
         state.selectedStrategy?.type === 'CLIENT_DRIVE' && 
         uploadProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <DriveUploadProgress />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}