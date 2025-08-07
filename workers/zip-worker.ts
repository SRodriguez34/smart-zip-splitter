/**
 * ZIP Processing Web Worker
 * Maneja el procesamiento de archivos ZIP en background thread
 */

/// <reference lib="webworker" />

// Importaciones específicas para el worker
declare const self: DedicatedWorkerGlobalScope;

// Simular importaciones (en un worker real necesitaríamos bundling especial)
interface ProcessingMessage {
  type: 'PROCESS_ZIP' | 'CANCEL' | 'PING';
  id: string;
  payload?: any;
}

interface ProgressMessage {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR' | 'PONG';
  id: string;
  payload: any;
}

/**
 * Estado del worker
 */
class WorkerState {
  private currentTask: string | null = null;
  private isProcessing: boolean = false;
  private shouldCancel: boolean = false;

  public startTask(taskId: string): void {
    this.currentTask = taskId;
    this.isProcessing = true;
    this.shouldCancel = false;
  }

  public cancelTask(): void {
    this.shouldCancel = true;
  }

  public completeTask(): void {
    this.currentTask = null;
    this.isProcessing = false;
    this.shouldCancel = false;
  }

  public get processing(): boolean {
    return this.isProcessing;
  }

  public get cancelled(): boolean {
    return this.shouldCancel;
  }

  public get currentTaskId(): string | null {
    return this.currentTask;
  }
}

const workerState = new WorkerState();

/**
 * Procesa archivo ZIP en el worker
 */
async function processZipInWorker(
  taskId: string,
  fileArrayBuffer: ArrayBuffer,
  options: any
): Promise<void> {
  try {
    workerState.startTask(taskId);
    
    // Simular importación de JSZip (en producción se importaría correctamente)
    const JSZip = (globalThis as any).JSZip;
    if (!JSZip) {
      throw new Error('JSZip not available in worker context');
    }

    // Reportar inicio
    postMessage({
      type: 'PROGRESS',
      id: taskId,
      payload: {
        phase: 'initialization',
        progress: 0,
        message: 'Initializing ZIP processing in background...'
      }
    } as ProgressMessage);

    // Verificar cancelación
    if (workerState.cancelled) {
      throw new Error('Task cancelled');
    }

    // Cargar ZIP
    postMessage({
      type: 'PROGRESS',
      id: taskId,
      payload: {
        phase: 'reading',
        progress: 10,
        message: 'Loading ZIP file in worker...'
      }
    } as ProgressMessage);

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(fileArrayBuffer);

    if (workerState.cancelled) {
      throw new Error('Task cancelled');
    }

    // Analizar contenido
    postMessage({
      type: 'PROGRESS',
      id: taskId,
      payload: {
        phase: 'analyzing',
        progress: 25,
        message: 'Analyzing ZIP structure...'
      }
    } as ProgressMessage);

    const files = Object.values(loadedZip.files).filter(f => !f.dir);
    const totalFiles = files.length;
    let processedFiles = 0;

    // Crear fragmentos
    const fragments: any[] = [];
    const targetSize = options.fragmentSize || (25 * 1024 * 1024); // 25MB default
    let currentFragment: any[] = [];
    let currentSize = 0;

    for (const file of files) {
      if (workerState.cancelled) {
        throw new Error('Task cancelled');
      }

      const fileSize = file._data?.uncompressedSize || 0;
      
      // Si el archivo actual haría que el fragmento exceda el tamaño objetivo
      if (currentSize + fileSize > targetSize && currentFragment.length > 0) {
        // Crear fragmento actual
        const fragmentBlob = await createFragmentBlob(currentFragment, options);
        fragments.push({
          name: `fragment_${fragments.length + 1}.zip`,
          size: fragmentBlob.size,
          blob: fragmentBlob
        });

        currentFragment = [file];
        currentSize = fileSize;
      } else {
        currentFragment.push(file);
        currentSize += fileSize;
      }

      processedFiles++;
      const progress = 25 + (processedFiles / totalFiles) * 50;
      
      postMessage({
        type: 'PROGRESS',
        id: taskId,
        payload: {
          phase: 'processing',
          progress,
          message: `Processing file ${processedFiles}/${totalFiles}...`
        }
      } as ProgressMessage);

      // Yield para no bloquear el worker
      if (processedFiles % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    // Crear último fragmento si hay archivos restantes
    if (currentFragment.length > 0) {
      const fragmentBlob = await createFragmentBlob(currentFragment, options);
      fragments.push({
        name: `fragment_${fragments.length + 1}.zip`,
        size: fragmentBlob.size,
        blob: fragmentBlob
      });
    }

    if (workerState.cancelled) {
      throw new Error('Task cancelled');
    }

    // Completar procesamiento
    postMessage({
      type: 'COMPLETE',
      id: taskId,
      payload: {
        success: true,
        fragments: fragments.map((f, index) => ({
          ...f,
          id: `fragment_${index}`,
          // El blob se enviará por separado debido a limitaciones de transferencia
        })),
        metrics: {
          totalFiles,
          totalFragments: fragments.length,
          processingTime: Date.now() - workerState.currentTaskId
        }
      }
    } as ProgressMessage);

    // Enviar blobs por separado
    for (let i = 0; i < fragments.length; i++) {
      if (workerState.cancelled) break;
      
      postMessage({
        type: 'FRAGMENT_BLOB',
        id: taskId,
        payload: {
          fragmentIndex: i,
          blob: fragments[i].blob
        }
      }, [fragments[i].blob]);
    }

    workerState.completeTask();

  } catch (error) {
    workerState.completeTask();
    
    postMessage({
      type: 'ERROR',
      id: taskId,
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        cancelled: workerState.cancelled
      }
    } as ProgressMessage);
  }
}

/**
 * Crea un blob de fragmento a partir de archivos
 */
async function createFragmentBlob(files: any[], options: any): Promise<Blob> {
  const JSZip = (globalThis as any).JSZip;
  const fragmentZip = new JSZip();

  // Agregar archivos al fragmento
  for (const file of files) {
    const content = await file.async('arraybuffer');
    fragmentZip.file(file.name, content);
  }

  // Generar ZIP del fragmento
  return await fragmentZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: options.compressionLevel || 6
    }
  });
}

/**
 * Maneja mensajes del hilo principal
 */
self.addEventListener('message', async (event: MessageEvent<ProcessingMessage>) => {
  const { type, id, payload } = event.data;

  switch (type) {
    case 'PING':
      // Responder a ping para verificar que el worker está vivo
      postMessage({
        type: 'PONG',
        id,
        payload: {
          status: 'alive',
          processing: workerState.processing,
          currentTask: workerState.currentTaskId
        }
      } as ProgressMessage);
      break;

    case 'PROCESS_ZIP':
      if (workerState.processing) {
        postMessage({
          type: 'ERROR',
          id,
          payload: {
            message: 'Worker is already processing another task',
            code: 'WORKER_BUSY'
          }
        } as ProgressMessage);
        return;
      }

      try {
        await processZipInWorker(id, payload.fileArrayBuffer, payload.options);
      } catch (error) {
        postMessage({
          type: 'ERROR',
          id,
          payload: {
            message: error instanceof Error ? error.message : 'Processing failed',
            code: 'PROCESSING_ERROR'
          }
        } as ProgressMessage);
      }
      break;

    case 'CANCEL':
      if (workerState.processing) {
        workerState.cancelTask();
        postMessage({
          type: 'PROGRESS',
          id,
          payload: {
            phase: 'cancelled',
            progress: 0,
            message: 'Cancelling processing...'
          }
        } as ProgressMessage);
      }
      break;

    default:
      postMessage({
        type: 'ERROR',
        id: id || 'unknown',
        payload: {
          message: `Unknown message type: ${type}`,
          code: 'UNKNOWN_MESSAGE_TYPE'
        }
      } as ProgressMessage);
  }
});

/**
 * Manejo de errores no capturados
 */
self.addEventListener('error', (event: ErrorEvent) => {
  postMessage({
    type: 'ERROR',
    id: workerState.currentTaskId || 'unknown',
    payload: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      code: 'WORKER_ERROR'
    }
  } as ProgressMessage);
});

/**
 * Manejo de promesas rechazadas
 */
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  postMessage({
    type: 'ERROR',
    id: workerState.currentTaskId || 'unknown',
    payload: {
      message: event.reason?.message || 'Unhandled promise rejection',
      code: 'UNHANDLED_REJECTION'
    }
  } as ProgressMessage);
});

// Enviar mensaje de inicialización
postMessage({
  type: 'READY',
  id: 'init',
  payload: {
    message: 'ZIP Worker initialized and ready',
    timestamp: Date.now()
  }
} as ProgressMessage);

export {}; // Para que TypeScript trate esto como un módulo