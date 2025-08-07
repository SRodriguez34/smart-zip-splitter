/**
 * useZipWorker Hook
 * Hook personalizado para manejar el procesamiento ZIP en Web Worker
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import type { ProcessingOptions, ProcessingResult } from '@/types/processing';

interface WorkerMessage {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR' | 'PONG' | 'READY' | 'FRAGMENT_BLOB';
  id: string;
  payload: any;
}

interface WorkerProgressData {
  phase: string;
  progress: number;
  message: string;
}

interface WorkerCompleteData {
  success: boolean;
  fragments: any[];
  metrics: any;
}

interface WorkerErrorData {
  message: string;
  code?: string;
  cancelled?: boolean;
}

export interface ZipWorkerState {
  isProcessing: boolean;
  progress: number;
  phase: string;
  message: string;
  error: string | null;
  result: ProcessingResult | null;
}

export interface ZipWorkerActions {
  processFile: (file: File, options: ProcessingOptions) => Promise<ProcessingResult>;
  cancel: () => void;
  ping: () => Promise<boolean>;
}

/**
 * Hook para manejar procesamiento ZIP con Web Worker
 */
export function useZipWorker(): [ZipWorkerState, ZipWorkerActions] {
  const workerRef = useRef<Worker | null>(null);
  const currentTaskRef = useRef<string | null>(null);
  const fragmentBlobsRef = useRef<Map<number, Blob>>(new Map());
  const resolveRef = useRef<((result: ProcessingResult) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  const [state, setState] = useState<ZipWorkerState>({
    isProcessing: false,
    progress: 0,
    phase: 'idle',
    message: '',
    error: null,
    result: null
  });

  /**
   * Inicializa el Web Worker
   */
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      return;
    }

    try {
      // Crear worker desde archivo estático
      workerRef.current = new Worker('/zip-worker.js');
      
      workerRef.current.addEventListener('message', handleWorkerMessage);
      workerRef.current.addEventListener('error', handleWorkerError);

    } catch (error) {
      console.error('Failed to initialize ZIP worker:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize worker: ' + (error instanceof Error ? error.message : 'Unknown error')
      }));
    }
  }, []);

  /**
   * Maneja mensajes del worker
   */
  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const { type, id, payload } = event.data;

    // Verificar si el mensaje es para la tarea actual
    if (currentTaskRef.current && id !== currentTaskRef.current && type !== 'READY' && type !== 'PONG') {
      return;
    }

    switch (type) {
      case 'READY':
        console.log('ZIP Worker initialized');
        break;

      case 'PROGRESS':
        const progressData = payload as WorkerProgressData;
        setState(prev => ({
          ...prev,
          progress: progressData.progress,
          phase: progressData.phase,
          message: progressData.message
        }));
        break;

      case 'COMPLETE':
        const completeData = payload as WorkerCompleteData;
        
        // Esperar a que lleguen todos los blobs de fragmentos
        const fragments = completeData.fragments.map((fragment, index) => ({
          ...fragment,
          blob: fragmentBlobsRef.current.get(index)
        }));

        const result: ProcessingResult = {
          success: completeData.success,
          fragments,
          metrics: {
            startTime: Date.now() - (completeData.metrics?.processingTime || 0),
            endTime: Date.now(),
            totalTime: completeData.metrics?.processingTime || 0,
            memoryUsage: completeData.metrics?.originalSize || 0,
            compressionRatio: completeData.metrics?.compressionRatio || 1,
            throughput: completeData.metrics?.processingTime > 0 
              ? (completeData.metrics?.originalSize || 0) / (completeData.metrics?.processingTime / 1000)
              : 0
          }
        };

        setState(prev => ({
          ...prev,
          isProcessing: false,
          progress: 100,
          phase: 'complete',
          message: 'Processing completed successfully!',
          result,
          error: null
        }));

        if (resolveRef.current) {
          resolveRef.current(result);
          resolveRef.current = null;
        }

        currentTaskRef.current = null;
        fragmentBlobsRef.current.clear();
        break;

      case 'FRAGMENT_BLOB':
        // Almacenar blob de fragmento
        fragmentBlobsRef.current.set(payload.fragmentIndex, payload.blob);
        break;

      case 'ERROR':
        const errorData = payload as WorkerErrorData;
        
        setState(prev => ({
          ...prev,
          isProcessing: false,
          phase: errorData.cancelled ? 'cancelled' : 'error',
          message: errorData.message,
          error: errorData.message
        }));

        if (rejectRef.current) {
          rejectRef.current(new Error(errorData.message));
          rejectRef.current = null;
        }

        currentTaskRef.current = null;
        fragmentBlobsRef.current.clear();
        break;

      case 'PONG':
        // Respuesta a ping - no necesita acción especial
        break;

      default:
        console.warn('Unknown worker message type:', type);
    }
  }, []);

  /**
   * Maneja errores del worker
   */
  const handleWorkerError = useCallback((error: ErrorEvent) => {
    const errorMessage = `Worker error: ${error.message}`;
    
    setState(prev => ({
      ...prev,
      isProcessing: false,
      phase: 'error',
      message: errorMessage,
      error: errorMessage
    }));

    if (rejectRef.current) {
      rejectRef.current(new Error(errorMessage));
      rejectRef.current = null;
    }
  }, []);

  /**
   * Procesa un archivo usando el worker
   */
  const processFile = useCallback(async (file: File, options: ProcessingOptions): Promise<ProcessingResult> => {
    if (!workerRef.current) {
      initializeWorker();
      
      // Esperar a que el worker esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (state.isProcessing) {
      throw new Error('Another processing task is already running');
    }

    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentTaskRef.current = taskId;
      resolveRef.current = resolve;
      rejectRef.current = reject;

      setState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 0,
        phase: 'initialization',
        message: 'Starting processing...',
        error: null,
        result: null
      }));

      // Convertir archivo a ArrayBuffer
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer && workerRef.current) {
          workerRef.current.postMessage({
            type: 'PROCESS_ZIP',
            id: taskId,
            payload: {
              fileArrayBuffer: reader.result,
              options
            }
          }, [reader.result]); // Transferir ArrayBuffer
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }, [state.isProcessing, initializeWorker]);

  /**
   * Cancela el procesamiento actual
   */
  const cancel = useCallback(() => {
    if (workerRef.current && currentTaskRef.current) {
      workerRef.current.postMessage({
        type: 'CANCEL',
        id: currentTaskRef.current,
        payload: {}
      });
    }
  }, []);

  /**
   * Verifica si el worker está vivo
   */
  const ping = useCallback(async (): Promise<boolean> => {
    if (!workerRef.current) {
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      const messageHandler = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === 'PONG') {
          clearTimeout(timeout);
          workerRef.current?.removeEventListener('message', messageHandler);
          resolve(true);
        }
      };

      workerRef.current.addEventListener('message', messageHandler);
      workerRef.current.postMessage({
        type: 'PING',
        id: 'ping_' + Date.now(),
        payload: {}
      });
    });
  }, []);

  /**
   * Inicializar worker al montar el hook
   */
  useEffect(() => {
    initializeWorker();
    
    // Cleanup al desmontar
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      currentTaskRef.current = null;
      resolveRef.current = null;
      rejectRef.current = null;
      fragmentBlobsRef.current.clear();
    };
  }, [initializeWorker]);

  return [
    state,
    {
      processFile,
      cancel,
      ping
    }
  ];
}