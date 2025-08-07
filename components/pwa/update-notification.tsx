/**
 * PWA Update Notification Component
 * Notifies users when a new version is available and handles updates
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface UpdateNotificationProps {
  className?: string;
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export function UpdateNotification({ 
  className = "", 
  onUpdate, 
  onDismiss 
}: UpdateNotificationProps) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      const handleServiceWorkerUpdate = async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Check for waiting service worker (update available)
        if (registration.waiting) {
          setNewWorker(registration.waiting);
          setShowUpdate(true);
        }

        // Listen for new service worker installations
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setNewWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });

        // Listen for controller changes (new service worker took over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Reload the page to get the new content
          window.location.reload();
        });
      };

      handleServiceWorkerUpdate();
    }
  }, []);

  const handleUpdate = async () => {
    if (!newWorker) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      // Tell the waiting service worker to skip waiting and become active
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Give the service worker time to activate
      setTimeout(() => {
        onUpdate?.();
        // The page will reload automatically when the controller changes
      }, 1000);
      
    } catch (error) {
      console.error('[PWA] Update error:', error);
      setUpdateError('Failed to update. Please refresh the page manually.');
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    onDismiss?.();
    
    // Remember dismissal for this session
    sessionStorage.setItem('update-dismissed', 'true');
  };

  const handleManualRefresh = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}
        >
          <Card className="bg-white border border-blue-200 shadow-2xl">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <Download className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Update Available</h4>
                    <p className="text-xs text-gray-600">New version ready</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="h-6 w-6 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  A new version of Smart ZIP Splitter is available with improvements and bug fixes.
                </p>

                {/* Features */}
                <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-blue-800">
                    <CheckCircle className="h-3 w-3" />
                    <span>Performance improvements</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-blue-800">
                    <CheckCircle className="h-3 w-3" />
                    <span>Enhanced security</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-blue-800">
                    <CheckCircle className="h-3 w-3" />
                    <span>Bug fixes</span>
                  </div>
                </div>

                {/* Error message */}
                {updateError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-800">{updateError}</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isUpdating ? (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-3 w-3" />
                        <span>Update Now</span>
                      </div>
                    )}
                  </Button>
                  
                  {updateError && (
                    <Button
                      onClick={handleManualRefresh}
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                    >
                      Refresh
                    </Button>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Info className="h-3 w-3" />
                  <span>Update will reload the page automatically</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for programmatic update management
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkForUpdates = async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          setNewWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setNewWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      };

      checkForUpdates();
    }
  }, []);

  const applyUpdate = () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  };

  return {
    updateAvailable,
    applyUpdate,
    checkForUpdates
  };
}