/**
 * Processing Hook
 * Hook avanzado para gestión completa del procesamiento de archivos ZIP
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAppState, useAppActions } from './use-app-state';
import { useZipWorker } from './useZipWorker';
import { useGoogleDrive } from './use-google-drive';
import { ZipProcessor } from '@/lib/zip-processor';
import { DriveProcessor } from '@/lib/drive-processor';
import { DownloadManager } from '@/lib/download-manager';
import { ProgressTracker } from '@/lib/progress-tracker';
import { analyzeFile, generateStrategyConfig } from '@/lib/strategy-selector';
import type { 
  ProcessingOptions, 
  ProcessingResult, 
  ProcessingStrategyType,
  ProcessedFragment 
} from '@/types/processing';

export interface ProcessingCapabilities {
  canProcessLocal: boolean;
  canProcessDrive: boolean;
  canProcessServer: boolean;
  hasWebWorkerSupport: boolean;
  hasGoogleDriveAccess: boolean;
}

export interface ProcessingHookReturn {
  // State
  capabilities: ProcessingCapabilities;
  isProcessing: boolean;
  canStartProcessing: boolean;
  
  // Actions
  analyzeCurrentFile: () => Promise<void>;
  startProcessing: () => Promise<void>;
  cancelProcessing: () => void;
  retryProcessing: () => Promise<void>;
  
  // Download Management  
  startDownload: () => Promise<void>;
  cancelDownload: () => void;
  retryFailedDownloads: () => Promise<void>;
  
  // Google Drive Integration
  signInToGoogle: () => Promise<void>;
  signOutOfGoogle: () => Promise<void>;
  
  // Utilities
  estimateProcessingTime: (strategy?: ProcessingStrategyType) => number;
  getRecommendedFragmentSize: (strategy?: ProcessingStrategyType) => number;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

/**
 * Hook principal para procesamiento de archivos
 */
export function useProcessing(): ProcessingHookReturn {
  const { state } = useAppState();
  const actions = useAppActions();
  
  // Referencias para mantener instancias
  const zipProcessorRef = useRef<ZipProcessor | null>(null);
  const driveProcessorRef = useRef<DriveProcessor | null>(null);
  const downloadManagerRef = useRef<DownloadManager | null>(null);
  const progressTrackerRef = useRef<ProgressTracker | null>(null);
  
  // Hook para Web Worker
  const [workerState, workerActions] = useZipWorker();
  
  // Hook para Google Drive
  const googleDrive = useGoogleDrive();

  // Inicializar procesadores
  useEffect(() => {
    // ZIP Processor
    if (!zipProcessorRef.current) {
      zipProcessorRef.current = new ZipProcessor();
    }

    // Drive Processor
    if (!driveProcessorRef.current) {
      driveProcessorRef.current = new DriveProcessor();
      
      // Configurar callbacks para Google Drive
      driveProcessorRef.current.setAuthStatusCallback((authStatus) => {
        if (authStatus.isSignedIn && authStatus.user) {
          actions.setGoogleUser({
            id: authStatus.user.email,
            name: authStatus.user.name,
            email: authStatus.user.email,
            picture: authStatus.user.picture
          });
        } else {
          actions.setGoogleUser(null);
        }
      });
    }

    // Download Manager
    if (!downloadManagerRef.current) {
      downloadManagerRef.current = new DownloadManager();
      
      // Configurar callbacks de descarga
      downloadManagerRef.current.setProgressCallback((progress) => {
        actions.setDownloadBatch({
          id: progress.batchId,
          name: progress.batchName,
          status: 'downloading',
          progress: progress.overallProgress,
          totalItems: progress.totalItems,
          completedItems: progress.completedItems,
          failedItems: progress.failedItems
        });
      });

      downloadManagerRef.current.setStatusCallback((batchId, status) => {
        actions.setDownloadBatch({
          id: batchId,
          name: state.downloadBatch?.name || 'Download',
          status,
          progress: status === 'completed' ? 100 : state.downloadBatch?.progress || 0,
          totalItems: state.downloadBatch?.totalItems || 0,
          completedItems: state.downloadBatch?.completedItems || 0,
          failedItems: state.downloadBatch?.failedItems || 0
        });
      });
    }

    return () => {
      // Cleanup en desmontaje
      zipProcessorRef.current?.dispose();
      driveProcessorRef.current?.dispose();
      downloadManagerRef.current?.dispose();
      progressTrackerRef.current?.dispose();
    };
  }, [actions]);

  // Configurar callbacks de progreso basados en estrategia
  useEffect(() => {
    if (!state.selectedStrategy) return;

    const strategy = state.selectedStrategy.type;
    const fileSize = state.currentFile?.size || 0;

    // Crear y configurar Progress Tracker
    if (progressTrackerRef.current) {
      progressTrackerRef.current.dispose();
    }
    
    progressTrackerRef.current = new ProgressTracker(strategy, fileSize);
    
    // Suscribirse a actualizaciones de progreso
    const unsubscribe = progressTrackerRef.current.subscribe((update) => {
      actions.updateProgress({
        overall: update.totalProgress,
        phase: update.phaseProgress,
        estimatedTimeLeft: update.estimatedTimeRemaining,
        processedBytes: update.metrics.completedBytes,
        totalBytes: update.metrics.totalBytes,
        currentPhase: update.phase,
        message: update.message,
        throughput: update.metrics.throughput
      });
    });

    // Configurar callbacks en procesadores
    if (strategy === 'CLIENT_SIDE') {
      zipProcessorRef.current?.setProgressCallback((progress, message) => {
        progressTrackerRef.current?.updatePhaseProgress(progress);
      });
    } else if (strategy === 'CLIENT_DRIVE') {
      driveProcessorRef.current?.setProgressCallback((progress, message) => {
        progressTrackerRef.current?.updatePhaseProgress(progress);
      });
    }

    return unsubscribe;
  }, [state.selectedStrategy, state.currentFile, actions]);

  // Capacidades del sistema
  const capabilities: ProcessingCapabilities = {
    canProcessLocal: true,
    canProcessDrive: state.isGoogleAuthenticated,
    canProcessServer: false, // Por implementar
    hasWebWorkerSupport: typeof Worker !== 'undefined',
    hasGoogleDriveAccess: state.isGoogleAuthenticated
  };

  const isProcessing = ['analyzing', 'processing', 'uploading'].includes(state.status);
  
  const canStartProcessing = !!(
    state.currentFile &&
    state.selectedStrategy &&
    !isProcessing &&
    !state.error
  );

  // Analizar archivo actual
  const analyzeCurrentFile = useCallback(async () => {
    if (!state.currentFile) {
      throw new Error('No file selected');
    }

    try {
      actions.setStatus('analyzing');
      actions.clearError();

      const analysis = await analyzeFile(state.currentFile);
      actions.setAnalysis(analysis);

      // Auto-seleccionar estrategia recomendada si no hay una seleccionada
      if (!state.selectedStrategy) {
        const { AVAILABLE_STRATEGIES } = await import('@/lib/strategy-selector');
        const recommendedStrategy = AVAILABLE_STRATEGIES[analysis.recommendedStrategy];
        actions.setStrategy(recommendedStrategy);
      }

      actions.setStatus('idle');
      
      actions.addNotification({
        type: 'success',
        title: 'File analyzed successfully',
        message: `Found ${analysis.entryCount} entries, recommended strategy: ${analysis.recommendedStrategy}`
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Analysis failed';
      actions.setError({
        code: 'ANALYSIS_FAILED',
        message: errorMsg,
        recoverable: true,
        suggestedAction: 'Try selecting the file again'
      });

      actions.addNotification({
        type: 'error',
        title: 'Analysis failed',
        message: errorMsg
      });
    }
  }, [state.currentFile, state.selectedStrategy, actions]);

  // Iniciar procesamiento
  const startProcessing = useCallback(async () => {
    if (!canStartProcessing || !state.currentFile || !state.selectedStrategy) {
      return;
    }

    try {
      actions.setStatus('processing');
      actions.clearError();
      actions.resetProgress();

      const strategy = state.selectedStrategy.type;
      const config = generateStrategyConfig(
        strategy,
        state.currentFile.size,
        state.processingConfig.targetFragmentSize * 1024 * 1024 // Convert MB to bytes
      );

      const processingOptions: ProcessingOptions = {
        strategy,
        fragmentSize: config.targetFragmentSize * 1024 * 1024,
        compressionLevel: state.processingConfig.compressionLevel,
        customFilename: state.currentFile.name.replace(/\.[^/.]+$/, ''),
        includeManifest: state.processingConfig.includeManifest
      };

      // Iniciar progress tracker
      progressTrackerRef.current?.start();

      let result: ProcessingResult;

      // Procesar según estrategia
      if (strategy === 'CLIENT_SIDE') {
        if (capabilities.hasWebWorkerSupport && state.currentFile.size > 10 * 1024 * 1024) {
          // Usar Web Worker para archivos grandes
          result = await workerActions.processFile(state.currentFile, processingOptions);
        } else {
          // Usar procesamiento directo
          result = await zipProcessorRef.current!.processFile(state.currentFile, processingOptions);
        }
      } else if (strategy === 'CLIENT_DRIVE') {
        if (!state.isGoogleAuthenticated) {
          throw new Error('Google Drive authentication required');
        }
        
        // Usar nuestro hook de Google Drive directamente
        actions.setStatus('uploading');
        
        // Procesar archivo localmente primero
        const localResult = await zipProcessorRef.current!.processFile(state.currentFile, processingOptions);
        if (!localResult.success) {
          throw new Error(localResult.error?.message || 'Local processing failed');
        }
        
        // Subir fragmentos a Google Drive
        const driveResult = await googleDrive.uploadFragments(localResult.fragments!, localResult.manifest);
        
        // Crear resultado combinado
        result = {
          ...localResult,
          driveFolder: driveResult.folder,
          driveFiles: driveResult.files,
          shareableManifest: driveResult.spreadsheet?.spreadsheetUrl,
          driveSpreadsheet: driveResult.spreadsheet
        } as any;
      } else {
        throw new Error(`Strategy ${strategy} not implemented`);
      }

      if (!result.success) {
        throw new Error(result.error?.message || 'Processing failed');
      }

      // Guardar resultados
      actions.setFragments(result.fragments || []);
      actions.setMetrics(result.metrics);
      
      // Guardar datos específicos de Google Drive si aplica
      if (strategy === 'CLIENT_DRIVE' && 'driveFolder' in result) {
        const driveResult = result as any;
        actions.setGoogleDriveData({
          folderId: driveResult.driveFolder?.id,
          folderName: driveResult.driveFolder?.name,
          folderUrl: driveResult.driveFolder?.webViewLink,
          shareUrl: driveResult.driveFolder?.shareableLink,
          fileLinks: driveResult.driveFiles?.map((file: any) => ({
            name: file.fileName,
            url: file.shareableLink,
            size: file.size
          })),
          manifestUrl: driveResult.shareableManifest
        });
      }

      progressTrackerRef.current?.complete();
      actions.setStatus('complete');
      
      actions.addNotification({
        type: 'success',
        title: 'Processing completed',
        message: `Successfully created ${result.fragments?.length || 0} fragments`
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      actions.setError({
        code: 'PROCESSING_FAILED',
        message: errorMsg,
        recoverable: true,
        suggestedAction: 'Check your settings and try again'
      });

      progressTrackerRef.current?.error(errorMsg);
      
      actions.addNotification({
        type: 'error',
        title: 'Processing failed',
        message: errorMsg
      });
    }
  }, [canStartProcessing, state, actions, capabilities, workerActions]);

  // Cancelar procesamiento
  const cancelProcessing = useCallback(() => {
    if (state.selectedStrategy?.type === 'CLIENT_SIDE' && capabilities.hasWebWorkerSupport) {
      workerActions.cancel();
    }
    
    actions.setStatus('idle');
    actions.resetProgress();
    
    actions.addNotification({
      type: 'info',
      title: 'Processing cancelled',
      message: 'The processing operation was cancelled by user'
    });
  }, [state.selectedStrategy, capabilities, workerActions, actions]);

  // Reintentar procesamiento
  const retryProcessing = useCallback(async () => {
    actions.clearError();
    await startProcessing();
  }, [actions, startProcessing]);

  // Iniciar descarga
  const startDownload = useCallback(async () => {
    if (!state.fragments || state.fragments.length === 0) {
      actions.addNotification({
        type: 'warning',
        title: 'No fragments available',
        message: 'Process a file first before downloading'
      });
      return;
    }

    try {
      actions.setStatus('downloading');
      
      const batchId = downloadManagerRef.current!.createBatch(
        state.fragments,
        undefined, // manifest se incluirá automáticamente si está configurado
        {
          batchSize: 3,
          retryAttempts: 3,
          delayBetweenDownloads: 500,
          createZipArchive: state.processingConfig.createZipArchive,
          autoStartNext: true,
          includeManifest: state.processingConfig.includeManifest
        }
      );

      await downloadManagerRef.current!.startBatch(batchId);
      
      actions.setStatus('complete');
      actions.addNotification({
        type: 'success',
        title: 'Download completed',
        message: 'All fragments have been downloaded successfully'
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Download failed';
      actions.setError({
        code: 'DOWNLOAD_FAILED',
        message: errorMsg,
        recoverable: true,
        suggestedAction: 'Try downloading again'
      });

      actions.addNotification({
        type: 'error',
        title: 'Download failed',
        message: errorMsg
      });
    }
  }, [state.fragments, state.processingConfig, actions]);

  // Cancelar descarga
  const cancelDownload = useCallback(() => {
    if (state.downloadBatch) {
      downloadManagerRef.current?.cancelBatch(state.downloadBatch.id);
    }
    actions.setStatus('complete');
  }, [state.downloadBatch, actions]);

  // Reintentar descargas fallidas
  const retryFailedDownloads = useCallback(async () => {
    if (state.downloadBatch) {
      await downloadManagerRef.current?.retryFailedItems(state.downloadBatch.id);
    }
  }, [state.downloadBatch]);

  // Autenticación Google Drive - delegar a nuestro hook
  const signInToGoogle = useCallback(async () => {
    await googleDrive.signIn();
  }, [googleDrive]);

  const signOutOfGoogle = useCallback(async () => {
    await googleDrive.signOut();
  }, [googleDrive]);

  // Utilidades
  const estimateProcessingTime = useCallback((strategy?: ProcessingStrategyType) => {
    if (!state.fileAnalysis) return 0;
    
    const targetStrategy = strategy || state.selectedStrategy?.type || 'CLIENT_SIDE';
    const { estimateProcessingTime } = require('@/lib/strategy-selector');
    return estimateProcessingTime(state.fileAnalysis.size, targetStrategy);
  }, [state.fileAnalysis, state.selectedStrategy]);

  const getRecommendedFragmentSize = useCallback((strategy?: ProcessingStrategyType) => {
    if (!state.currentFile) return 25;
    
    const targetStrategy = strategy || state.selectedStrategy?.type || 'CLIENT_SIDE';
    const { calculateOptimalFragmentSize } = require('@/lib/strategy-selector');
    return Math.round(calculateOptimalFragmentSize(state.currentFile.size, targetStrategy) / (1024 * 1024));
  }, [state.currentFile, state.selectedStrategy]);

  const validateFile = useCallback((file: File) => {
    const maxSizes = {
      'CLIENT_SIDE': 100 * 1024 * 1024, // 100MB
      'CLIENT_DRIVE': 2 * 1024 * 1024 * 1024, // 2GB
      'SERVER_PREMIUM': 10 * 1024 * 1024 * 1024 // 10GB
    };

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return {
        valid: false,
        error: 'Only ZIP files are supported'
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'File appears to be empty'
      };
    }

    const strategy = state.selectedStrategy?.type || 'CLIENT_SIDE';
    const maxSize = maxSizes[strategy];
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large for ${strategy} strategy (max: ${Math.round(maxSize / (1024 * 1024))}MB)`
      };
    }

    return { valid: true };
  }, [state.selectedStrategy]);

  return {
    // State
    capabilities,
    isProcessing,
    canStartProcessing,
    
    // Actions
    analyzeCurrentFile,
    startProcessing,
    cancelProcessing,
    retryProcessing,
    
    // Download Management
    startDownload,
    cancelDownload,
    retryFailedDownloads,
    
    // Google Drive Integration
    signInToGoogle,
    signOutOfGoogle,
    
    // Utilities
    estimateProcessingTime,
    getRecommendedFragmentSize,
    validateFile
  };
}