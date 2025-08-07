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
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
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

export function ProgressBar({ progress, className }: ProgressBarProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const { state, percentage, message, estimatedTime, strategy } = progress;
  
  const config = getStateConfig(state);
  const contextualMessage = message || getContextualMessage(state, percentage, strategy);
  const IconComponent = config.icon;

  // Smooth percentage animation
  useEffect(() => {
    if (state === 'idle') {
      setDisplayPercentage(0);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage, state]);

  if (state === 'idle') {
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
                    key={state}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className={`
                      flex h-8 w-8 items-center justify-center rounded-full 
                      ${config.color}
                      ${state === 'processing' || state === 'analyzing' ? 'animate-spin' : ''}
                    `}
                  >
                    <IconComponent className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {state.charAt(0).toUpperCase() + state.slice(1).replace('_', ' ')}
                </h3>
                {strategy && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {strategy === 'CLIENT_SIDE' ? 'Client-side processing' : 'Google Drive integration'}
                  </p>
                )}
              </div>
            </div>

            {/* Time Estimation */}
            {estimatedTime && estimatedTime > 0 && state !== 'complete' && state !== 'error' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400"
              >
                <Clock className="h-4 w-4" />
                <span>{formatTime(estimatedTime)}</span>
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
              {(state === 'processing' || state === 'analyzing' || state === 'uploading') && (
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

          {/* Success/Error Additional Info */}
          <AnimatePresence>
            {state === 'complete' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200"
              >
                <p className="text-sm text-green-800">
                  🎉 Processing completed successfully! 
                  {strategy === 'CLIENT_SIDE' && ' Your files are ready for download.'}
                  {strategy === 'CLIENT_DRIVE' && ' Check your Google Drive for the split files.'}
                </p>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200"
              >
                <p className="text-sm text-red-800">
                  ❌ Processing failed. Please check your file and try again.
                  If the problem persists, try with a smaller file.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}