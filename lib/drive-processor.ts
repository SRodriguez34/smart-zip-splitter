/**
 * Drive Processor
 * Procesador para la estrategia CLIENT_DRIVE con integración de Google Drive
 */

import { GoogleDriveClient } from './google-drive-client';
import { ZipProcessor } from './zip-processor';
import type {
  ProcessingOptions,
  ProcessingResult,
  ProcessedFragment,
  ProcessingManifest,
  ProcessingError,
  ProcessingMetrics
} from '@/types/processing';

export interface DriveProcessingOptions extends ProcessingOptions {
  createPublicLinks: boolean;
  organizeFolders: boolean;
  includeManifestInDrive: boolean;
}

export interface DriveProcessingResult extends ProcessingResult {
  driveFolder?: {
    id: string;
    name: string;
    webViewLink: string;
    shareableLink: string;
  };
  driveFiles?: Array<{
    fileId: string;
    fileName: string;
    size: number;
    webViewLink: string;
    downloadUrl: string;
    shareableLink: string;
  }>;
  shareableManifest?: string;
}

/**
 * Procesador para archivos ZIP con almacenamiento en Google Drive
 */
export class DriveProcessor {
  private driveClient: GoogleDriveClient;
  private zipProcessor: ZipProcessor;
  private progressCallback?: (progress: number, message: string) => void;

  constructor() {
    this.driveClient = new GoogleDriveClient();
    this.zipProcessor = new ZipProcessor();
  }

  /**
   * Establece callback para reportar progreso
   */
  public setProgressCallback(callback: (progress: number, message: string) => void): void {
    this.progressCallback = callback;
    this.zipProcessor.setProgressCallback((progress, message) => {
      // El procesamiento ZIP ocupa el primer 50% del progreso
      this.reportProgress(progress * 0.5, message);
    });

    this.driveClient.setProgressCallback((driveProgress) => {
      // El upload a Drive ocupa el segundo 50% del progreso
      const globalProgress = 50 + (driveProgress.percentage * 0.5);
      this.reportProgress(globalProgress, 
        `Uploading ${driveProgress.fileName} (${driveProgress.percentage}%) - ${this.formatSpeed(driveProgress.speed)}`
      );
    });
  }

  /**
   * Establece callback para cambios de estado de autenticación
   */
  public setAuthStatusCallback(callback: (status: any) => void): void {
    this.driveClient.setStatusCallback(callback);
  }

  /**
   * Obtiene estado de autenticación de Google Drive
   */
  public getAuthStatus(): any {
    return this.driveClient.getAuthStatus();
  }

  /**
   * Inicia sesión en Google Drive
   */
  public async signIn(): Promise<void> {
    return this.driveClient.signIn();
  }

  /**
   * Cierra sesión en Google Drive
   */
  public async signOut(): Promise<void> {
    return this.driveClient.signOut();
  }

  /**
   * Procesa archivo ZIP y sube fragmentos a Google Drive
   */
  public async processFile(
    file: File, 
    options: DriveProcessingOptions
  ): Promise<DriveProcessingResult> {
    const startTime = performance.now();
    this.reportProgress(0, 'Initializing Drive processor...');

    try {
      // Verificar autenticación
      const authStatus = this.driveClient.getAuthStatus();
      if (!authStatus.isSignedIn) {
        throw new Error('Not signed in to Google Drive. Please sign in first.');
      }

      // Validar opciones
      this.validateProcessingOptions(options);

      // Fase 1: Procesar ZIP localmente (0-50%)
      this.reportProgress(5, 'Processing ZIP file locally...');
      
      const zipResult = await this.zipProcessor.processFile(file, {
        ...options,
        strategy: 'CLIENT_SIDE' // Procesamos localmente primero
      });

      if (!zipResult.success || !zipResult.fragments) {
        throw new Error(zipResult.error?.message || 'ZIP processing failed');
      }

      // Fase 2: Subir a Google Drive (50-95%)
      this.reportProgress(50, 'Uploading fragments to Google Drive...');
      
      const driveResult = await this.driveClient.uploadFragments(
        zipResult.fragments,
        options
      );

      // Fase 3: Generar manifest para Drive (95-98%)
      this.reportProgress(95, 'Creating Drive manifest...');
      
      const driveManifest = this.createDriveManifest(
        file,
        zipResult.fragments,
        driveResult,
        options
      );

      // Fase 4: Subir manifest si es necesario (98-100%)
      let manifestUploadResult = null;
      if (options.includeManifestInDrive) {
        this.reportProgress(98, 'Uploading manifest to Drive...');
        manifestUploadResult = await this.uploadManifest(driveManifest, driveResult.folder.id);
      }

      // Calcular métricas finales
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const finalMetrics: ProcessingMetrics = {
        ...zipResult.metrics,
        totalTime,
        endTime,
        // Agregar métricas específicas de Drive
        uploadTime: totalTime - zipResult.metrics.totalTime,
        uploadThroughput: driveResult.totalSize / ((totalTime - zipResult.metrics.totalTime) / 1000)
      };

      this.reportProgress(100, 'Drive processing completed successfully!');

      return {
        success: true,
        fragments: zipResult.fragments,
        manifest: driveManifest,
        metrics: finalMetrics,
        driveFolder: driveResult.folder,
        driveFiles: driveResult.files,
        shareableManifest: manifestUploadResult?.shareableLink
      };

    } catch (error) {
      return this.handleProcessingError(error, startTime);
    }
  }

  /**
   * Crea manifest específico para Drive con enlaces
   */
  private createDriveManifest(
    originalFile: File,
    fragments: ProcessedFragment[],
    driveResult: any,
    options: DriveProcessingOptions
  ): ProcessingManifest & {
    driveInfo: {
      folderId: string;
      folderName: string;
      folderLink: string;
      files: Array<{
        driveFileId: string;
        shareableLink: string;
        downloadUrl: string;
      }>;
    };
    instructions: {
      howToDownload: string[];
      howToReassemble: string[];
    };
  } {
    const baseManifest = {
      originalFile: {
        name: originalFile.name,
        size: originalFile.size,
        checksum: '' // Se calculará si es necesario
      },
      fragments: fragments.map((fragment, index) => ({
        id: fragment.id,
        name: fragment.name,
        size: fragment.size,
        checksum: fragment.checksum,
        order: index + 1
      })),
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        strategy: 'CLIENT_DRIVE',
        compressionLevel: options.compressionLevel
      }
    };

    return {
      ...baseManifest,
      driveInfo: {
        folderId: driveResult.folder.id,
        folderName: driveResult.folder.name,
        folderLink: driveResult.folder.shareableLink,
        files: driveResult.files.map((file: any, index: number) => ({
          driveFileId: file.fileId,
          shareableLink: file.shareableLink,
          downloadUrl: file.downloadUrl
        }))
      },
      instructions: {
        howToDownload: [
          `1. Visit the folder: ${driveResult.folder.shareableLink}`,
          '2. Select all files in the folder',
          '3. Right-click and choose "Download"',
          '4. Google Drive will create a ZIP containing all fragments'
        ],
        howToReassemble: [
          '1. Extract the downloaded ZIP from Google Drive',
          '2. You should see all fragment files (.zip files)',
          '3. Use any ZIP extraction tool to extract each fragment',
          '4. Combine the extracted contents to reconstruct the original files',
          '5. Verify checksums using this manifest file'
        ]
      }
    };
  }

  /**
   * Sube manifest a Google Drive
   */
  private async uploadManifest(
    manifest: any,
    folderId: string
  ): Promise<{ shareableLink: string; downloadUrl: string }> {
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json'
    });

    const manifestFragment: ProcessedFragment = {
      id: 'manifest',
      name: 'manifest.json',
      size: manifestBlob.size,
      blob: manifestBlob,
      checksum: await this.calculateChecksum(manifestBlob)
    };

    const result = await this.driveClient.uploadFragments([manifestFragment], {
      strategy: 'CLIENT_DRIVE',
      fragmentSize: manifestBlob.size,
      compressionLevel: 0,
      customFilename: 'manifest'
    } as any);

    return {
      shareableLink: result.files[0].shareableLink,
      downloadUrl: result.files[0].downloadUrl
    };
  }

  /**
   * Calcula checksum SHA-256 de un blob
   */
  private async calculateChecksum(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Valida opciones de procesamiento para Drive
   */
  private validateProcessingOptions(options: DriveProcessingOptions): void {
    if (options.strategy !== 'CLIENT_DRIVE') {
      throw new Error('DriveProcessor only supports CLIENT_DRIVE strategy');
    }

    if (options.fragmentSize <= 0) {
      throw new Error('Fragment size must be greater than 0');
    }

    if (options.compressionLevel < 0 || options.compressionLevel > 9) {
      throw new Error('Compression level must be between 0 and 9');
    }
  }

  /**
   * Maneja errores de procesamiento
   */
  private handleProcessingError(error: unknown, startTime: number): DriveProcessingResult {
    const processingError: ProcessingError = {
      code: 'DRIVE_PROCESSING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown Drive processing error',
      details: error instanceof Error ? error.stack : undefined,
      recoverable: false,
      suggestedAction: 'Check Google Drive authentication and permissions, then try again'
    };

    const endTime = performance.now();
    const metrics: ProcessingMetrics = {
      startTime,
      endTime,
      totalTime: endTime - startTime,
      memoryUsage: 0,
      compressionRatio: 1,
      throughput: 0
    };

    return {
      success: false,
      fragments: [],
      error: processingError,
      metrics
    };
  }

  /**
   * Formatea velocidad de transferencia
   */
  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${Math.round(bytesPerSecond)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    } else {
      return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
    }
  }

  /**
   * Reporta progreso
   */
  private reportProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(Math.min(100, Math.max(0, progress)), message);
    }
  }

  /**
   * Limpia recursos
   */
  public dispose(): void {
    this.driveClient.dispose();
    this.zipProcessor.dispose();
    this.progressCallback = undefined;
  }
}