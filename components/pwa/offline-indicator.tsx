/**
 * PWA Offline Indicator Component
 * Shows network status and available offline features
 */

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Zap,
  HardDrive
} from 'lucide-react';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom';
  onStatusChange?: (isOnline: boolean) => void;
}

export function OfflineIndicator({ 
  className = "", 
  showDetails = false,
  position = 'bottom',
  onStatusChange 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [offlineStartTime, setOfflineStartTime] = useState<Date | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineNotice(false);
      setOfflineStartTime(null);
      
      // Show reconnection notification briefly
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
      
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineNotice(true);
      setOfflineStartTime(new Date());
      onStatusChange?.(false);
    };

    // Check cache availability
    const checkCacheStatus = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          setCacheStatus(cacheNames.length > 0 ? 'available' : 'unavailable');
        } catch {
          setCacheStatus('unavailable');
        }
      } else {
        setCacheStatus('unavailable');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkCacheStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  const handleRetryConnection = () => {
    // Force check by trying to fetch a small resource
    fetch('/favicon.ico', { cache: 'no-cache' })
      .then(() => {
        if (!navigator.onLine) {
          // Manually trigger online event if fetch succeeds but navigator.onLine is false
          setIsOnline(true);
          setShowOfflineNotice(false);
          onStatusChange?.(true);
        }
      })
      .catch(() => {
        // Still offline
        console.log('Still offline');
      });
  };

  const formatOfflineTime = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Simple status indicator (always visible)
  const StatusIndicator = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} left-4 z-40`}
    >
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium shadow-lg ${
        isOnline 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <StatusIndicator />
      
      {/* Reconnection notification */}
      <AnimatePresence>
        {showReconnected && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
            className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50`}
          >
            <Card className="bg-green-50 border-green-200 p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Back Online!</p>
                  <p className="text-sm text-green-600">Connection restored</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed offline notice */}
      <AnimatePresence>
        {(showOfflineNotice || !isOnline) && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
            className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50 max-w-sm ${className}`}
          >
            <Card className="bg-yellow-50 border-yellow-200">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-yellow-100 rounded-full">
                      <WifiOff className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800">You're Offline</h4>
                      {offlineStartTime && (
                        <p className="text-xs text-yellow-600">
                          For {formatOfflineTime(offlineStartTime)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOfflineNotice(false)}
                    className="h-6 w-6 text-yellow-400 hover:text-yellow-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Available features */}
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <h5 className="font-medium text-gray-800 mb-2 text-sm">Still Available:</h5>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-700">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Split files locally (up to 100MB)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-700">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Download processed files</span>
                      </div>
                      <div className={`flex items-center space-x-2 text-xs ${
                        cacheStatus === 'available' ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        <CheckCircle className={`h-3 w-3 ${
                          cacheStatus === 'available' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span>Cached app content</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="font-medium text-gray-800 mb-2 text-sm">Requires Connection:</h5>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <CloudOff className="h-3 w-3" />
                        <span>Google Drive integration</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <CloudOff className="h-3 w-3" />
                        <span>File sharing and QR codes</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <CloudOff className="h-3 w-3" />
                        <span>Large file processing</span>
                      </div>
                    </div>
                  </div>

                  {/* Retry button */}
                  <Button
                    onClick={handleRetryConnection}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Check Connection
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Hook for network status management
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    setIsOnline(navigator.onLine);

    // Get connection type if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown');
      
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      });
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isSlowConnection: ['slow-2g', '2g'].includes(connectionType)
  };
}