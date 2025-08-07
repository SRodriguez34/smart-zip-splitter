/**
 * Download Manager
 * Sistema avanzado para gestionar descargas de fragmentos con control de batch, progreso y reintentos
 */

import { saveAs } from 'file-saver';
import type { ProcessedFragment, ProcessingManifest } from '@/types/processing';

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadItem {
  id: string;
  fragment: ProcessedFragment;
  status: DownloadStatus;
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
  retryCount: number;
  downloadUrl?: string; // Para descargas desde URLs
}

export interface DownloadBatch {
  id: string;
  name: string;
  items: DownloadItem[];
  status: DownloadStatus;
  startTime: number;
  endTime?: number;
  totalSize: number;
  downloadedSize: number;
  options: DownloadOptions;
}

export interface DownloadOptions {
  batchSize: number; // Número de descargas simultáneas
  retryAttempts: number; // Intentos por archivo
  delayBetweenDownloads: number; // ms entre descargas
  createZipArchive: boolean; // Crear ZIP con todos los fragmentos
  autoStartNext: boolean; // Iniciar siguiente descarga automáticamente
  includeManifest: boolean; // Incluir manifest en las descargas
  downloadDirectory?: string; // Directorio de descarga (para futuro)
}

export interface DownloadProgress {
  batchId: string;
  batchName: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentItem?: DownloadItem;
  overallProgress: number;
  downloadSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  totalSize: number;
  downloadedSize: number;
}

/**
 * Administrador de descargas para fragmentos de archivos
 */
export class DownloadManager {
  private batches: Map<string, DownloadBatch> = new Map();
  private activeDownloads: Map<string, AbortController> = new Map();
  private progressCallback?: (progress: DownloadProgress) => void;
  private statusCallback?: (batchId: string, status: DownloadStatus) => void;
  private defaultOptions: DownloadOptions = {
    batchSize: 3,
    retryAttempts: 3,
    delayBetweenDownloads: 500,
    createZipArchive: false,
    autoStartNext: true,
    includeManifest: true
  };

  /**
   * Establece callback para actualizaciones de progreso
   */
  public setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Establece callback para cambios de estado
   */
  public setStatusCallback(callback: (batchId: string, status: DownloadStatus) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Crea un nuevo batch de descargas
   */
  public createBatch(
    fragments: ProcessedFragment[],
    manifest?: ProcessingManifest,
    options: Partial<DownloadOptions> = {}
  ): string {
    const batchId = this.generateBatchId();
    const batchOptions = { ...this.defaultOptions, ...options };
    
    const items: DownloadItem[] = fragments.map((fragment) => ({
      id: this.generateItemId(),
      fragment,
      status: 'pending' as DownloadStatus,
      progress: 0,
      retryCount: 0
    }));

    // Agregar manifest si está habilitado
    if (manifest && batchOptions.includeManifest) {
      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json'
      });

      const manifestFragment: ProcessedFragment = {
        id: 'manifest',
        name: 'manifest.json',
        size: manifestBlob.size,
        blob: manifestBlob,
        checksum: 'manifest-checksum'
      };

      items.push({
        id: this.generateItemId(),
        fragment: manifestFragment,
        status: 'pending' as DownloadStatus,
        progress: 0,
        retryCount: 0
      });
    }

    const totalSize = items.reduce((sum, item) => sum + item.fragment.size, 0);

    const batch: DownloadBatch = {
      id: batchId,
      name: this.generateBatchName(fragments[0]?.name || 'archive'),
      items,
      status: 'pending',
      startTime: Date.now(),
      totalSize,
      downloadedSize: 0,
      options: batchOptions
    };

    this.batches.set(batchId, batch);
    return batchId;
  }

  /**
   * Inicia descargas de un batch
   */
  public async startBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    batch.status = 'downloading';
    batch.startTime = Date.now();
    this.notifyStatusChange(batchId, 'downloading');

    try {
      await this.processBatch(batch);
      
      // Verificar si todos los items se completaron exitosamente
      const failedItems = batch.items.filter(item => item.status === 'failed');
      
      if (failedItems.length === 0) {
        batch.status = 'completed';
        batch.endTime = Date.now();
        
        // Crear archivo ZIP si está habilitado
        if (batch.options.createZipArchive) {
          await this.createZipArchive(batch);
        }
      } else {
        batch.status = 'failed';
        batch.endTime = Date.now();
      }

    } catch (error) {
      batch.status = 'failed';
      batch.endTime = Date.now();
      throw error;
    } finally {
      this.notifyStatusChange(batchId, batch.status);
      this.cleanupBatch(batchId);
    }
  }

  /**
   * Procesa un batch con control de concurrencia
   */
  private async processBatch(batch: DownloadBatch): Promise<void> {
    const { batchSize } = batch.options;
    const pendingItems = batch.items.filter(item => item.status === 'pending');
    
    // Procesar items en lotes
    for (let i = 0; i < pendingItems.length; i += batchSize) {
      const currentBatch = pendingItems.slice(i, i + batchSize);
      
      // Descargar items del lote actual en paralelo
      const downloadPromises = currentBatch.map(item => 
        this.downloadItem(item, batch)
      );

      await Promise.allSettled(downloadPromises);

      // Aplicar delay entre lotes si no es el último
      if (i + batchSize < pendingItems.length && batch.options.delayBetweenDownloads > 0) {
        await this.delay(batch.options.delayBetweenDownloads);
      }
    }
  }

  /**
   * Descarga un item individual con reintentos
   */
  private async downloadItem(item: DownloadItem, batch: DownloadBatch): Promise<void> {
    const maxRetries = batch.options.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        item.status = 'downloading';
        item.startTime = Date.now();
        item.retryCount = attempt;

        this.updateProgress(batch);

        if (item.downloadUrl) {
          // Descarga desde URL
          await this.downloadFromUrl(item, batch);
        } else if (item.fragment.blob) {
          // Descarga desde blob local
          await this.downloadFromBlob(item, batch);
        } else {
          throw new Error('No download source available for item');
        }

        item.status = 'completed';
        item.endTime = Date.now();
        item.progress = 100;
        batch.downloadedSize += item.fragment.size;
        
        this.updateProgress(batch);
        return;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Esperar antes del reintento
          await this.delay(Math.pow(2, attempt) * 1000); // Backoff exponencial
        }
      }
    }

    // Todos los reintentos fallaron
    item.status = 'failed';
    item.endTime = Date.now();
    item.error = lastError?.message || 'Download failed after maximum retries';
    
    this.updateProgress(batch);
  }

  /**
   * Descarga desde blob local
   */
  private async downloadFromBlob(item: DownloadItem, batch: DownloadBatch): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!item.fragment.blob) {
          reject(new Error('Fragment blob not available'));
          return;
        }

        // Usar file-saver para descarga directa
        saveAs(item.fragment.blob, item.fragment.name);
        
        // Simular progreso para consistencia
        item.progress = 100;
        resolve();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Descarga desde URL externa
   */
  private async downloadFromUrl(item: DownloadItem, batch: DownloadBatch): Promise<void> {
    if (!item.downloadUrl) {
      throw new Error('Download URL not specified');
    }

    const abortController = new AbortController();
    this.activeDownloads.set(item.id, abortController);

    try {
      const response = await fetch(item.downloadUrl, {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body not readable');
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Actualizar progreso
        if (contentLength > 0) {
          item.progress = Math.round((receivedLength / contentLength) * 100);
          this.updateProgress(batch);
        }
      }

      // Crear blob y descargar
      const blob = new Blob(chunks);
      saveAs(blob, item.fragment.name);

    } finally {
      this.activeDownloads.delete(item.id);
    }
  }

  /**
   * Crea archivo ZIP con todos los fragmentos
   */
  private async createZipArchive(batch: DownloadBatch): Promise<void> {
    // Importar JSZip dinámicamente
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Agregar fragmentos exitosos al ZIP
    const completedItems = batch.items.filter(item => 
      item.status === 'completed' && item.fragment.blob
    );

    for (const item of completedItems) {
      if (item.fragment.blob) {
        zip.file(item.fragment.name, item.fragment.blob);
      }
    }

    // Generar y descargar ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const archiveName = `${batch.name}_complete.zip`;
    saveAs(zipBlob, archiveName);
  }

  /**
   * Cancela todas las descargas de un batch
   */
  public cancelBatch(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return;
    }

    // Abortar descargas activas
    batch.items.forEach(item => {
      if (item.status === 'downloading') {
        const abortController = this.activeDownloads.get(item.id);
        if (abortController) {
          abortController.abort();
        }
        item.status = 'cancelled';
      }
    });

    batch.status = 'cancelled';
    batch.endTime = Date.now();
    
    this.notifyStatusChange(batchId, 'cancelled');
    this.cleanupBatch(batchId);
  }

  /**
   * Reinicia items fallidos de un batch
   */
  public async retryFailedItems(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const failedItems = batch.items.filter(item => item.status === 'failed');
    
    if (failedItems.length === 0) {
      return;
    }

    // Resetear items fallidos
    failedItems.forEach(item => {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
      item.retryCount = 0;
    });

    batch.status = 'downloading';
    this.notifyStatusChange(batchId, 'downloading');

    await this.processBatch(batch);
  }

  /**
   * Obtiene información de un batch
   */
  public getBatch(batchId: string): DownloadBatch | undefined {
    return this.batches.get(batchId);
  }

  /**
   * Obtiene todos los batches
   */
  public getAllBatches(): DownloadBatch[] {
    return Array.from(this.batches.values());
  }

  /**
   * Actualiza y notifica progreso
   */
  private updateProgress(batch: DownloadBatch): void {
    if (!this.progressCallback) {
      return;
    }

    const completedItems = batch.items.filter(item => item.status === 'completed').length;
    const failedItems = batch.items.filter(item => item.status === 'failed').length;
    const currentItem = batch.items.find(item => item.status === 'downloading');
    
    const overallProgress = batch.totalSize > 0 
      ? Math.round((batch.downloadedSize / batch.totalSize) * 100)
      : Math.round((completedItems / batch.items.length) * 100);

    // Calcular velocidad de descarga
    const elapsedTime = (Date.now() - batch.startTime) / 1000;
    const downloadSpeed = elapsedTime > 0 ? batch.downloadedSize / elapsedTime : 0;
    
    // Calcular tiempo restante estimado
    const remainingSize = batch.totalSize - batch.downloadedSize;
    const estimatedTimeRemaining = downloadSpeed > 0 ? remainingSize / downloadSpeed : 0;

    const progress: DownloadProgress = {
      batchId: batch.id,
      batchName: batch.name,
      totalItems: batch.items.length,
      completedItems,
      failedItems,
      currentItem,
      overallProgress,
      downloadSpeed,
      estimatedTimeRemaining,
      totalSize: batch.totalSize,
      downloadedSize: batch.downloadedSize
    };

    this.progressCallback(progress);
  }

  /**
   * Notifica cambio de estado
   */
  private notifyStatusChange(batchId: string, status: DownloadStatus): void {
    if (this.statusCallback) {
      this.statusCallback(batchId, status);
    }
  }

  /**
   * Limpia recursos de un batch
   */
  private cleanupBatch(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return;
    }

    // Limpiar controladores de abort
    batch.items.forEach(item => {
      this.activeDownloads.delete(item.id);
    });
  }

  /**
   * Elimina un batch completamente
   */
  public removeBatch(batchId: string): void {
    this.cancelBatch(batchId);
    this.batches.delete(batchId);
  }

  /**
   * Utilidades
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchName(baseName: string): string {
    const timestamp = new Date().toLocaleString().replace(/[^\w]/g, '_');
    return `${baseName.replace(/\.[^/.]+$/, '')}_${timestamp}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpia todos los recursos
   */
  public dispose(): void {
    // Cancelar todos los batches activos
    this.batches.forEach((_, batchId) => {
      this.cancelBatch(batchId);
    });

    this.batches.clear();
    this.activeDownloads.clear();
    this.progressCallback = undefined;
    this.statusCallback = undefined;
  }
}