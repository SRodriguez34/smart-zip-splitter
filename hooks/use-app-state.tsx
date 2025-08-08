/**
 * App State Management
 * Estado global de la aplicación con Context + Reducer para gestión completa del flujo de procesamiento
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { 
  ProcessingStrategy, 
  ProcessingStrategyType, 
  FileAnalysis, 
  ProcessedFragment,
  ProcessingError,
  ProcessingMetrics
} from '@/types/processing';
import type { ProgressUpdate } from '@/lib/progress-tracker';

// Tipos para el estado de la aplicación
export interface ProcessingConfig {
  targetFragmentSize: number; // en MB
  fragmentNaming: string;
  compressionLevel: number;
  includeManifest: boolean;
  createZipArchive: boolean;
}

export interface ProcessingProgress {
  overall: number; // 0-100
  phase: number; // 0-100
  estimatedTimeLeft: number; // en segundos
  processedBytes: number;
  totalBytes: number;
  currentPhase: string;
  message: string;
  throughput: number; // bytes/second
}

export interface GoogleDriveData {
  folderId?: string;
  folderName?: string;
  folderUrl?: string;
  shareUrl?: string;
  fileLinks?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  manifestUrl?: string;
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface DownloadBatchInfo {
  id: string;
  name: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
}

export type AppStatus = 
  | 'idle' 
  | 'analyzing' 
  | 'processing' 
  | 'uploading' 
  | 'downloading' 
  | 'complete' 
  | 'error';

export interface AppState {
  // File Management
  currentFile: File | null;
  fileAnalysis: FileAnalysis | null;
  
  // Strategy & Configuration  
  selectedStrategy: ProcessingStrategy | null;
  availableStrategies: ProcessingStrategy[];
  processingConfig: ProcessingConfig;
  
  // Processing State
  status: AppStatus;
  progress: ProcessingProgress;
  
  // Results
  fragments: ProcessedFragment[] | null;
  processingMetrics: ProcessingMetrics | null;
  downloadBatch: DownloadBatchInfo | null;
  
  // Google Drive Integration
  googleDriveData: GoogleDriveData | null;
  
  // Error Handling
  error: ProcessingError | null;
  
  // Google Authentication
  googleUser: GoogleUser | null;
  isGoogleAuthenticated: boolean;
  
  // UI State
  showAdvancedOptions: boolean;
  activeTab: string;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    autoClose?: boolean;
  }>;
}

// Action Types
export enum AppActionType {
  // File Management
  SET_FILE = 'SET_FILE',
  SET_ANALYSIS = 'SET_ANALYSIS',
  CLEAR_FILE = 'CLEAR_FILE',
  
  // Strategy & Configuration
  SET_STRATEGY = 'SET_STRATEGY',
  SET_AVAILABLE_STRATEGIES = 'SET_AVAILABLE_STRATEGIES',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  RESET_CONFIG = 'RESET_CONFIG',
  
  // Processing State
  SET_STATUS = 'SET_STATUS',
  UPDATE_PROGRESS = 'UPDATE_PROGRESS',
  RESET_PROGRESS = 'RESET_PROGRESS',
  
  // Results
  SET_FRAGMENTS = 'SET_FRAGMENTS',
  SET_METRICS = 'SET_METRICS',
  SET_DOWNLOAD_BATCH = 'SET_DOWNLOAD_BATCH',
  UPDATE_DOWNLOAD_PROGRESS = 'UPDATE_DOWNLOAD_PROGRESS',
  
  // Google Drive
  SET_GOOGLE_DRIVE_DATA = 'SET_GOOGLE_DRIVE_DATA',
  CLEAR_GOOGLE_DRIVE_DATA = 'CLEAR_GOOGLE_DRIVE_DATA',
  
  // Error Handling
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  // Google Authentication
  SET_GOOGLE_USER = 'SET_GOOGLE_USER',
  SET_GOOGLE_AUTH_STATUS = 'SET_GOOGLE_AUTH_STATUS',
  CLEAR_GOOGLE_AUTH = 'CLEAR_GOOGLE_AUTH',
  
  // UI State
  TOGGLE_ADVANCED_OPTIONS = 'TOGGLE_ADVANCED_OPTIONS',
  SET_ACTIVE_TAB = 'SET_ACTIVE_TAB',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS',
  
  // System
  RESET_ALL = 'RESET_ALL'
}

// Action Interfaces
export interface AppAction {
  type: AppActionType;
  payload?: any;
}

// Estado inicial
const initialState: AppState = {
  // File Management
  currentFile: null,
  fileAnalysis: null,
  
  // Strategy & Configuration
  selectedStrategy: null,
  availableStrategies: [],
  processingConfig: {
    targetFragmentSize: 25, // 25MB default
    fragmentNaming: 'sequential',
    compressionLevel: 6,
    includeManifest: true,
    createZipArchive: false
  },
  
  // Processing State
  status: 'idle',
  progress: {
    overall: 0,
    phase: 0,
    estimatedTimeLeft: 0,
    processedBytes: 0,
    totalBytes: 0,
    currentPhase: 'idle',
    message: 'Ready to process files',
    throughput: 0
  },
  
  // Results
  fragments: null,
  processingMetrics: null,
  downloadBatch: null,
  
  // Google Drive Integration
  googleDriveData: null,
  
  // Error Handling
  error: null,
  
  // Google Authentication
  googleUser: null,
  isGoogleAuthenticated: false,
  
  // UI State
  showAdvancedOptions: false,
  activeTab: 'upload',
  notifications: []
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // File Management
    case AppActionType.SET_FILE:
      return {
        ...state,
        currentFile: action.payload,
        fileAnalysis: null,
        fragments: null,
        error: null,
        status: 'idle'
      };

    case AppActionType.SET_ANALYSIS:
      return {
        ...state,
        fileAnalysis: action.payload
      };

    case AppActionType.CLEAR_FILE:
      return {
        ...state,
        currentFile: null,
        fileAnalysis: null,
        fragments: null,
        error: null,
        status: 'idle',
        progress: initialState.progress
      };

    // Strategy & Configuration
    case AppActionType.SET_STRATEGY:
      return {
        ...state,
        selectedStrategy: action.payload
      };

    case AppActionType.SET_AVAILABLE_STRATEGIES:
      return {
        ...state,
        availableStrategies: action.payload
      };

    case AppActionType.UPDATE_CONFIG:
      return {
        ...state,
        processingConfig: {
          ...state.processingConfig,
          ...action.payload
        }
      };

    case AppActionType.RESET_CONFIG:
      return {
        ...state,
        processingConfig: initialState.processingConfig
      };

    // Processing State
    case AppActionType.SET_STATUS:
      return {
        ...state,
        status: action.payload
      };

    case AppActionType.UPDATE_PROGRESS:
      return {
        ...state,
        progress: {
          ...state.progress,
          ...action.payload
        }
      };

    case AppActionType.RESET_PROGRESS:
      return {
        ...state,
        progress: initialState.progress
      };

    // Results
    case AppActionType.SET_FRAGMENTS:
      return {
        ...state,
        fragments: action.payload
      };

    case AppActionType.SET_METRICS:
      return {
        ...state,
        processingMetrics: action.payload
      };

    case AppActionType.SET_DOWNLOAD_BATCH:
      return {
        ...state,
        downloadBatch: action.payload
      };

    case AppActionType.UPDATE_DOWNLOAD_PROGRESS:
      return {
        ...state,
        downloadBatch: state.downloadBatch ? {
          ...state.downloadBatch,
          ...action.payload
        } : action.payload
      };

    // Google Drive
    case AppActionType.SET_GOOGLE_DRIVE_DATA:
      return {
        ...state,
        googleDriveData: action.payload
      };

    case AppActionType.CLEAR_GOOGLE_DRIVE_DATA:
      return {
        ...state,
        googleDriveData: null
      };

    // Error Handling
    case AppActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        status: 'error'
      };

    case AppActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    // Google Authentication
    case AppActionType.SET_GOOGLE_USER:
      return {
        ...state,
        googleUser: action.payload,
        isGoogleAuthenticated: !!action.payload
      };

    case AppActionType.SET_GOOGLE_AUTH_STATUS:
      return {
        ...state,
        isGoogleAuthenticated: action.payload
      };

    case AppActionType.CLEAR_GOOGLE_AUTH:
      return {
        ...state,
        googleUser: null,
        isGoogleAuthenticated: false,
        googleDriveData: null
      };

    // UI State
    case AppActionType.TOGGLE_ADVANCED_OPTIONS:
      return {
        ...state,
        showAdvancedOptions: !state.showAdvancedOptions
      };

    case AppActionType.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload
      };

    case AppActionType.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            autoClose: true,
            ...action.payload
          }
        ]
      };

    case AppActionType.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case AppActionType.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };

    // System
    case AppActionType.RESET_ALL:
      return {
        ...initialState,
        // Preservar autenticación de Google si existe
        googleUser: state.googleUser,
        isGoogleAuthenticated: state.isGoogleAuthenticated
      };

    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider Component
interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Auto-cleanup de notificaciones
  useEffect(() => {
    const autoCloseNotifications = state.notifications
      .filter(n => n.autoClose && Date.now() - n.timestamp > 5000);

    if (autoCloseNotifications.length > 0) {
      const timer = setTimeout(() => {
        autoCloseNotifications.forEach(notification => {
          dispatch({
            type: AppActionType.REMOVE_NOTIFICATION,
            payload: notification.id
          });
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [state.notifications]);

  // Persistir configuración en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smartZipSplitter_config', JSON.stringify(state.processingConfig));
    } catch (error) {
      console.warn('Failed to persist config to localStorage:', error);
    }
  }, [state.processingConfig]);

  // Cargar configuración desde localStorage al inicio
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('smartZipSplitter_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        dispatch({
          type: AppActionType.UPDATE_CONFIG,
          payload: config
        });
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
  }, []);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook personalizado para usar el estado
export function useAppState() {
  const context = useContext(AppStateContext);
  
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  
  return context;
}

// Hook con acciones pre-construidas para facilitar el uso
export function useAppActions() {
  const { dispatch } = useAppState();

  return {
    // File Management
    setFile: (file: File | null) => 
      dispatch({ type: AppActionType.SET_FILE, payload: file }),
    
    setAnalysis: (analysis: FileAnalysis) => 
      dispatch({ type: AppActionType.SET_ANALYSIS, payload: analysis }),
    
    clearFile: () => 
      dispatch({ type: AppActionType.CLEAR_FILE }),

    // Strategy & Configuration
    setStrategy: (strategy: ProcessingStrategy) => 
      dispatch({ type: AppActionType.SET_STRATEGY, payload: strategy }),
    
    setAvailableStrategies: (strategies: ProcessingStrategy[]) => 
      dispatch({ type: AppActionType.SET_AVAILABLE_STRATEGIES, payload: strategies }),
    
    updateConfig: (config: Partial<ProcessingConfig>) => 
      dispatch({ type: AppActionType.UPDATE_CONFIG, payload: config }),
    
    resetConfig: () => 
      dispatch({ type: AppActionType.RESET_CONFIG }),

    // Processing State
    setStatus: (status: AppStatus) => 
      dispatch({ type: AppActionType.SET_STATUS, payload: status }),
    
    updateProgress: (progress: Partial<ProcessingProgress>) => 
      dispatch({ type: AppActionType.UPDATE_PROGRESS, payload: progress }),
    
    resetProgress: () => 
      dispatch({ type: AppActionType.RESET_PROGRESS }),

    // Results
    setFragments: (fragments: ProcessedFragment[]) => 
      dispatch({ type: AppActionType.SET_FRAGMENTS, payload: fragments }),
    
    setMetrics: (metrics: ProcessingMetrics) => 
      dispatch({ type: AppActionType.SET_METRICS, payload: metrics }),
    
    setDownloadBatch: (batch: DownloadBatchInfo) => 
      dispatch({ type: AppActionType.SET_DOWNLOAD_BATCH, payload: batch }),

    // Google Drive
    setGoogleDriveData: (data: GoogleDriveData) => 
      dispatch({ type: AppActionType.SET_GOOGLE_DRIVE_DATA, payload: data }),
    
    clearGoogleDriveData: () => 
      dispatch({ type: AppActionType.CLEAR_GOOGLE_DRIVE_DATA }),

    // Error Handling
    setError: (error: ProcessingError) => 
      dispatch({ type: AppActionType.SET_ERROR, payload: error }),
    
    clearError: () => 
      dispatch({ type: AppActionType.CLEAR_ERROR }),

    // Google Authentication
    setGoogleUser: (user: GoogleUser | null) => 
      dispatch({ type: AppActionType.SET_GOOGLE_USER, payload: user }),
    
    setGoogleAuthStatus: (status: boolean) => 
      dispatch({ type: AppActionType.SET_GOOGLE_AUTH_STATUS, payload: status }),
    
    clearGoogleAuth: () => 
      dispatch({ type: AppActionType.CLEAR_GOOGLE_AUTH }),

    // UI State
    toggleAdvancedOptions: () => 
      dispatch({ type: AppActionType.TOGGLE_ADVANCED_OPTIONS }),
    
    setActiveTab: (tab: string) => 
      dispatch({ type: AppActionType.SET_ACTIVE_TAB, payload: tab }),

    // Notifications
    addNotification: (notification: {
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
      autoClose?: boolean;
    }) => dispatch({ type: AppActionType.ADD_NOTIFICATION, payload: notification }),
    
    removeNotification: (id: string) => 
      dispatch({ type: AppActionType.REMOVE_NOTIFICATION, payload: id }),
    
    clearNotifications: () => 
      dispatch({ type: AppActionType.CLEAR_NOTIFICATIONS }),

    // System
    resetAll: () => 
      dispatch({ type: AppActionType.RESET_ALL })
  };
}