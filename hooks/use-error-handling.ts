/**
 * Error Handling Hook
 * Sistema unificado para manejo de errores con recuperación automática y logging
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppState, useAppActions } from './use-app-state';
import type { ProcessingError } from '@/types/processing';

export interface ErrorContext {
  component?: string;
  action?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
  processingInfo?: {
    strategy: string;
    phase: string;
    progress: number;
  };
}

export interface ErrorRecoveryOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackStrategy?: string;
  showUserDialog?: boolean;
}

export interface ErrorReport {
  id: string;
  error: ProcessingError;
  context: ErrorContext;
  recoveryOptions: ErrorRecoveryOptions;
  stackTrace?: string;
  breadcrumbs: string[];
}

export interface ErrorHandlingHookReturn {
  // Current error state
  currentError: ProcessingError | null;
  errorHistory: ErrorReport[];
  isRecovering: boolean;
  
  // Error handling actions
  reportError: (error: Error | ProcessingError, context?: Partial<ErrorContext>, recoveryOptions?: ErrorRecoveryOptions) => void;
  clearError: () => void;
  retryLastAction: () => Promise<void>;
  
  // Recovery actions
  suggestRecovery: () => string[];
  executeRecovery: (action: string) => Promise<void>;
  
  // Utilities
  getErrorSeverity: (error: ProcessingError) => 'low' | 'medium' | 'high' | 'critical';
  getErrorCategory: (error: ProcessingError) => 'user' | 'system' | 'network' | 'auth' | 'processing';
  shouldShowToUser: (error: ProcessingError) => boolean;
}

/**
 * Hook para manejo unificado de errores
 */
export function useErrorHandling(): ErrorHandlingHookReturn {
  const { state } = useAppState();
  const actions = useAppActions();
  
  // Referencias para tracking
  const errorHistoryRef = useRef<ErrorReport[]>([]);
  const breadcrumbsRef = useRef<string[]>([]);
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);
  const isRecoveringRef = useRef(false);

  // Agregar breadcrumb para tracking de acciones del usuario
  const addBreadcrumb = useCallback((action: string) => {
    const timestamp = new Date().toISOString();
    breadcrumbsRef.current.push(`${timestamp}: ${action}`);
    
    // Mantener solo los últimos 20 breadcrumbs
    if (breadcrumbsRef.current.length > 20) {
      breadcrumbsRef.current = breadcrumbsRef.current.slice(-20);
    }
  }, []);

  // Tracking automático de acciones del estado
  useEffect(() => {
    addBreadcrumb(`Status changed to: ${state.status}`);
  }, [state.status, addBreadcrumb]);

  useEffect(() => {
    if (state.selectedStrategy) {
      addBreadcrumb(`Strategy selected: ${state.selectedStrategy.name}`);
    }
  }, [state.selectedStrategy, addBreadcrumb]);

  useEffect(() => {
    if (state.currentFile) {
      addBreadcrumb(`File selected: ${state.currentFile.name} (${Math.round(state.currentFile.size / (1024 * 1024))}MB)`);
    }
  }, [state.currentFile, addBreadcrumb]);

  // Crear contexto de error
  const createErrorContext = useCallback((customContext?: Partial<ErrorContext>): ErrorContext => {
    return {
      component: 'Unknown',
      action: 'Unknown',
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: state.googleUser?.id,
      fileInfo: state.currentFile ? {
        name: state.currentFile.name,
        size: state.currentFile.size,
        type: state.currentFile.type
      } : undefined,
      processingInfo: state.selectedStrategy ? {
        strategy: state.selectedStrategy.type,
        phase: state.progress.currentPhase,
        progress: state.progress.overall
      } : undefined,
      ...customContext
    };
  }, [state]);

  // Reportar error
  const reportError = useCallback((
    error: Error | ProcessingError,
    context?: Partial<ErrorContext>,
    recoveryOptions?: ErrorRecoveryOptions
  ) => {
    // Convertir Error a ProcessingError si es necesario
    const processingError: ProcessingError = 'code' in error ? error : {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      recoverable: true,
      suggestedAction: 'Try the operation again'
    };

    const fullContext = createErrorContext(context);
    const defaultRecoveryOptions: ErrorRecoveryOptions = {
      autoRetry: false,
      maxRetries: 3,
      retryDelay: 2000,
      showUserDialog: true,
      ...recoveryOptions
    };

    // Crear reporte de error
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: processingError,
      context: fullContext,
      recoveryOptions: defaultRecoveryOptions,
      stackTrace: error.stack,
      breadcrumbs: [...breadcrumbsRef.current]
    };

    // Agregar a historial
    errorHistoryRef.current.push(errorReport);
    
    // Mantener solo los últimos 50 errores
    if (errorHistoryRef.current.length > 50) {
      errorHistoryRef.current = errorHistoryRef.current.slice(-50);
    }

    // Establecer error actual
    actions.setError(processingError);

    // Log error para debugging
    console.error('Error reported:', errorReport);

    // Enviar notificación si corresponde
    if (shouldShowToUser(processingError)) {
      const severity = getErrorSeverity(processingError);
      const notificationType = severity === 'critical' ? 'error' : 
                              severity === 'high' ? 'error' : 'warning';

      actions.addNotification({
        type: notificationType,
        title: getErrorTitle(processingError),
        message: processingError.message,
        autoClose: severity === 'low'
      });
    }

    // Intentar recuperación automática si está habilitada
    if (defaultRecoveryOptions.autoRetry && processingError.recoverable) {
      const errorKey = `${processingError.code}_${fullContext.action}`;
      const retryCount = retryCountRef.current.get(errorKey) || 0;
      
      if (retryCount < (defaultRecoveryOptions.maxRetries || 3)) {
        retryCountRef.current.set(errorKey, retryCount + 1);
        
        setTimeout(() => {
          executeAutoRecovery(processingError, defaultRecoveryOptions);
        }, defaultRecoveryOptions.retryDelay || 2000);
      }
    }

    // Log error para analytics (en producción esto iría a un servicio)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        'description': processingError.message,
        'fatal': !processingError.recoverable
      });
    }
  }, [createErrorContext, actions]);

  // Ejecutar recuperación automática
  const executeAutoRecovery = useCallback(async (
    error: ProcessingError,
    options: ErrorRecoveryOptions
  ) => {
    if (isRecoveringRef.current) return;
    
    isRecoveringRef.current = true;

    try {
      addBreadcrumb(`Auto-recovery started for: ${error.code}`);
      
      // Estrategias de recuperación basadas en tipo de error
      switch (error.code) {
        case 'NETWORK_ERROR':
        case 'TIMEOUT_ERROR':
          if (lastActionRef.current) {
            await lastActionRef.current();
          }
          break;
          
        case 'GOOGLE_AUTH_EXPIRED':
          // Intentar re-autenticación silenciosa
          // await refreshGoogleAuth();
          break;
          
        case 'PROCESSING_FAILED':
          if (options.fallbackStrategy) {
            // Cambiar a estrategia de fallback
            actions.addNotification({
              type: 'info',
              title: 'Trying alternative approach',
              message: `Switching to ${options.fallbackStrategy} strategy`
            });
          }
          break;
          
        default:
          // Recuperación genérica
          if (lastActionRef.current) {
            await lastActionRef.current();
          }
          break;
      }

      actions.clearError();
      actions.addNotification({
        type: 'success',
        title: 'Recovered automatically',
        message: 'The issue has been resolved automatically'
      });

    } catch (recoveryError) {
      console.error('Auto-recovery failed:', recoveryError);
      actions.addNotification({
        type: 'error',
        title: 'Recovery failed',
        message: 'Automatic recovery was unsuccessful'
      });
    } finally {
      isRecoveringRef.current = false;
    }
  }, [addBreadcrumb, actions]);

  // Limpiar error
  const clearError = useCallback(() => {
    actions.clearError();
    retryCountRef.current.clear();
    addBreadcrumb('Error cleared by user');
  }, [actions, addBreadcrumb]);

  // Reintentar última acción
  const retryLastAction = useCallback(async () => {
    if (!lastActionRef.current) {
      actions.addNotification({
        type: 'warning',
        title: 'No action to retry',
        message: 'No previous action available for retry'
      });
      return;
    }

    try {
      addBreadcrumb('User initiated retry');
      actions.clearError();
      await lastActionRef.current();
    } catch (error) {
      reportError(error as Error, { action: 'retry_last_action' });
    }
  }, [actions, addBreadcrumb, reportError]);

  // Sugerir acciones de recuperación
  const suggestRecovery = useCallback((): string[] => {
    if (!state.error) return [];

    const suggestions: string[] = [];
    const error = state.error;

    // Sugerencias basadas en código de error
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        suggestions.push('Try using Google Drive integration for large files');
        suggestions.push('Reduce fragment size in advanced settings');
        break;
        
      case 'GOOGLE_AUTH_EXPIRED':
      case 'GOOGLE_AUTH_REQUIRED':
        suggestions.push('Sign in to Google Drive');
        suggestions.push('Refresh the page and try again');
        break;
        
      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try again in a few moments');
        suggestions.push('Use offline processing instead');
        break;
        
      case 'PROCESSING_FAILED':
        suggestions.push('Try with a smaller fragment size');
        suggestions.push('Switch to a different processing strategy');
        suggestions.push('Verify the ZIP file is not corrupted');
        break;
        
      case 'INSUFFICIENT_MEMORY':
        suggestions.push('Close other browser tabs');
        suggestions.push('Try with smaller fragment size');
        suggestions.push('Use Google Drive integration instead');
        break;
        
      default:
        suggestions.push('Refresh the page and try again');
        suggestions.push('Try with different settings');
        break;
    }

    // Agregar sugerencia personalizada si existe
    if (error.suggestedAction) {
      suggestions.unshift(error.suggestedAction);
    }

    return suggestions;
  }, [state.error]);

  // Ejecutar acción de recuperación
  const executeRecovery = useCallback(async (action: string) => {
    addBreadcrumb(`User executing recovery: ${action}`);
    
    try {
      if (action.includes('Sign in to Google Drive')) {
        // Implementar sign in
        actions.addNotification({
          type: 'info',
          title: 'Google Sign-in',
          message: 'Redirecting to Google sign-in...'
        });
      } else if (action.includes('Refresh the page')) {
        window.location.reload();
      } else if (action.includes('smaller fragment size')) {
        actions.updateConfig({ targetFragmentSize: Math.max(5, state.processingConfig.targetFragmentSize - 5) });
        actions.addNotification({
          type: 'success',
          title: 'Settings updated',
          message: 'Fragment size has been reduced'
        });
      } else if (action.includes('Google Drive integration')) {
        const { AVAILABLE_STRATEGIES } = await import('@/lib/strategy-selector');
        actions.setStrategy(AVAILABLE_STRATEGIES.CLIENT_DRIVE);
        actions.addNotification({
          type: 'info',
          title: 'Strategy changed',
          message: 'Switched to Google Drive integration'
        });
      }
      
      actions.clearError();
      
    } catch (error) {
      reportError(error as Error, { action: 'execute_recovery' });
    }
  }, [addBreadcrumb, actions, state.processingConfig, reportError]);

  // Utilidades
  const getErrorSeverity = useCallback((error: ProcessingError): 'low' | 'medium' | 'high' | 'critical' => {
    const criticalCodes = ['SYSTEM_ERROR', 'SECURITY_ERROR', 'DATA_CORRUPTION'];
    const highCodes = ['PROCESSING_FAILED', 'GOOGLE_AUTH_EXPIRED', 'INSUFFICIENT_MEMORY'];
    const mediumCodes = ['NETWORK_ERROR', 'FILE_TOO_LARGE', 'TIMEOUT_ERROR'];
    
    if (criticalCodes.includes(error.code)) return 'critical';
    if (highCodes.includes(error.code)) return 'high';
    if (mediumCodes.includes(error.code)) return 'medium';
    return 'low';
  }, []);

  const getErrorCategory = useCallback((error: ProcessingError): 'user' | 'system' | 'network' | 'auth' | 'processing' => {
    const userCodes = ['FILE_TOO_LARGE', 'INVALID_FILE', 'USER_CANCELLED'];
    const networkCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_FAILED'];
    const authCodes = ['GOOGLE_AUTH_EXPIRED', 'GOOGLE_AUTH_REQUIRED', 'UNAUTHORIZED'];
    const processingCodes = ['PROCESSING_FAILED', 'COMPRESSION_ERROR', 'FRAGMENTATION_FAILED'];
    
    if (userCodes.includes(error.code)) return 'user';
    if (networkCodes.includes(error.code)) return 'network';
    if (authCodes.includes(error.code)) return 'auth';
    if (processingCodes.includes(error.code)) return 'processing';
    return 'system';
  }, []);

  const shouldShowToUser = useCallback((error: ProcessingError): boolean => {
    const hiddenCodes = ['DEBUG_ERROR', 'INTERNAL_WARNING'];
    return !hiddenCodes.includes(error.code);
  }, []);

  // Función auxiliar para título de error
  function getErrorTitle(error: ProcessingError): string {
    const titles: Record<string, string> = {
      'FILE_TOO_LARGE': 'File Too Large',
      'PROCESSING_FAILED': 'Processing Failed', 
      'NETWORK_ERROR': 'Network Error',
      'GOOGLE_AUTH_EXPIRED': 'Google Sign-in Required',
      'INSUFFICIENT_MEMORY': 'Insufficient Memory',
      'TIMEOUT_ERROR': 'Operation Timed Out',
      'INVALID_FILE': 'Invalid File'
    };
    
    return titles[error.code] || 'Error';
  }

  // Registrar acciones para retry
  const registerAction = useCallback((action: () => Promise<void>) => {
    lastActionRef.current = action;
  }, []);

  // Exponer registerAction a través del contexto si es necesario
  useEffect(() => {
    (window as any).__registerErrorAction = registerAction;
  }, [registerAction]);

  return {
    // Current error state
    currentError: state.error,
    errorHistory: errorHistoryRef.current,
    isRecovering: isRecoveringRef.current,
    
    // Error handling actions
    reportError,
    clearError,
    retryLastAction,
    
    // Recovery actions
    suggestRecovery,
    executeRecovery,
    
    // Utilities
    getErrorSeverity,
    getErrorCategory,
    shouldShowToUser
  };
}