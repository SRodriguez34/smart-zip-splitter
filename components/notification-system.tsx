/**
 * Notification System
 * Sistema de notificaciones toast con animaciones y auto-dismiss
 */
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppState, useAppActions } from '@/hooks/use-app-state';

interface NotificationProps {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
  onDismiss: (id: string) => void;
}

/**
 * Componente individual de notificación
 */
function Notification({ id, type, title, message, timestamp, autoClose = true, onDismiss }: NotificationProps) {
  const config = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      messageColor: 'text-blue-700 dark:text-blue-200'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-950/50',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      messageColor: 'text-green-700 dark:text-green-200'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      messageColor: 'text-yellow-700 dark:text-yellow-200'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
      messageColor: 'text-red-700 dark:text-red-200'
    }
  };

  const notificationConfig = config[type];
  const IconComponent = notificationConfig.icon;

  // Auto-dismiss después de 5 segundos
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [id, autoClose, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30
      }}
      whileHover={{ scale: 1.02 }}
      className="w-full max-w-sm"
    >
      <Card className={`${notificationConfig.bgColor} ${notificationConfig.borderColor} border shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="flex-shrink-0 mt-0.5"
            >
              <IconComponent className={`h-5 w-5 ${notificationConfig.iconColor}`} />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${notificationConfig.titleColor} truncate`}>
                  {title}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDismiss(id)}
                  className={`h-6 w-6 ${notificationConfig.iconColor} hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0 ml-2`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <p className={`text-xs mt-1 ${notificationConfig.messageColor} leading-relaxed`}>
                {message}
              </p>
              
              {/* Progress bar for auto-close */}
              {autoClose && (
                <motion.div
                  className={`mt-2 h-1 ${notificationConfig.borderColor} rounded-full overflow-hidden`}
                >
                  <motion.div
                    className={`h-full ${notificationConfig.iconColor.replace('text-', 'bg-')}`}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Contenedor del sistema de notificaciones
 */
export function NotificationSystem() {
  const { state } = useAppState();
  const { removeNotification } = useAppActions();

  // Ordenar notificaciones por timestamp (más recientes primero)
  const sortedNotifications = [...state.notifications].sort((a, b) => b.timestamp - a.timestamp);

  if (sortedNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-h-screen overflow-hidden">
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
            onDismiss={removeNotification}
          />
        ))}
      </AnimatePresence>
      
      {/* Clear all button cuando hay muchas notificaciones */}
      {sortedNotifications.length > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sortedNotifications.forEach(n => removeNotification(n.id));
            }}
            className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Clear all ({sortedNotifications.length})
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Hook para usar notificaciones fácilmente
 */
export function useNotifications() {
  const { addNotification } = useAppActions();

  const notify = {
    success: (title: string, message: string, autoClose = true) => {
      addNotification({ type: 'success', title, message, autoClose });
    },
    
    error: (title: string, message: string, autoClose = false) => {
      addNotification({ type: 'error', title, message, autoClose });
    },
    
    warning: (title: string, message: string, autoClose = true) => {
      addNotification({ type: 'warning', title, message, autoClose });
    },
    
    info: (title: string, message: string, autoClose = true) => {
      addNotification({ type: 'info', title, message, autoClose });
    }
  };

  return notify;
}

/**
 * Notificaciones predefinidas para eventos comunes
 */
export const commonNotifications = {
  fileSelected: (fileName: string, size: number) => ({
    type: 'success' as const,
    title: 'File selected',
    message: `${fileName} (${Math.round(size / (1024 * 1024))}MB) is ready for processing`
  }),
  
  processingStarted: (strategy: string) => ({
    type: 'info' as const,
    title: 'Processing started',
    message: `Using ${strategy} strategy for optimal performance`
  }),
  
  processingComplete: (fragmentCount: number) => ({
    type: 'success' as const,
    title: 'Processing completed',
    message: `Successfully created ${fragmentCount} fragment${fragmentCount !== 1 ? 's' : ''}`
  }),
  
  downloadStarted: () => ({
    type: 'info' as const,
    title: 'Download started',
    message: 'Your file fragments are being prepared for download'
  }),
  
  driveUploadComplete: (folderName: string) => ({
    type: 'success' as const,
    title: 'Uploaded to Google Drive',
    message: `Files uploaded to "${folderName}" with shareable links created`
  }),
  
  authenticationRequired: () => ({
    type: 'warning' as const,
    title: 'Authentication required',
    message: 'Please sign in to Google Drive to use cloud integration features'
  }),
  
  networkError: () => ({
    type: 'error' as const,
    title: 'Network error',
    message: 'Please check your internet connection and try again'
  }),
  
  fileTooLarge: (maxSize: string) => ({
    type: 'error' as const,
    title: 'File too large',
    message: `File exceeds the maximum size limit of ${maxSize}. Try using a different processing strategy.`
  }),
  
  invalidFileType: () => ({
    type: 'error' as const,
    title: 'Invalid file type',
    message: 'Only ZIP files are supported. Please select a .zip file.'
  })
};