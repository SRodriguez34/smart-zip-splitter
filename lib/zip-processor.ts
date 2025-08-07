/**
 * ZIP Processor
 * Sistema de procesamiento de archivos ZIP con estrategia CLIENT_SIDE
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type {
  ProcessingOptions,
  ProcessingResult,
  ProcessedFragment,
  ProcessingManifest,
  ProcessingError,
  ProcessingMetrics,
  FileAnalysis
} from '@/types/processing';

// Configuración del procesador
const CHUNK_SIZE = 64 * 1024; // 64KB chunks para lectura progresiva
const MAX_MEMORY_USAGE = 500 * 1024 * 1024; // 500MB límite de memoria
const COMPRESSION_LEVELS = {
  0: 'No compression',
  1: 'Fast compression',
  6: 'Balanced compression',
  9: 'Maximum compression'
} as const;

/**
 * Clase principal para procesamiento de archivos ZIP
 */
export class ZipProcessor {
  private progressCallback?: (progress: number, message: string) => void;
  private metrics: ProcessingMetrics;
  private abortController: AbortController;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.abortController = new AbortController();
  }

  /**
   * Establece callback para reportar progreso
   */
  public setProgressCallback(callback: (progress: number, message: string) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Procesa un archivo ZIP según las opciones especificadas
   */
  public async processFile(
    file: File, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    this.metrics.startTime = performance.now();
    this.reportProgress(0, 'Initializing ZIP processor...');

    try {
      // Validar opciones
      this.validateProcessingOptions(options);
      
      // Validar disponibilidad de memoria
      await this.checkMemoryAvailability(file.size);

      // Leer y parsear el archivo ZIP
      this.reportProgress(10, 'Reading ZIP file...');
      const zipData = await this.readZipFile(file);

      // Analizar contenido del ZIP
      this.reportProgress(25, 'Analyzing ZIP contents...');
      const zipAnalysis = await this.analyzeZipContents(zipData);

      // Crear fragmentos según la estrategia
      this.reportProgress(40, 'Creating file fragments...');
      const fragments = await this.createFragments(zipData, options, zipAnalysis);

      // Generar manifest
      this.reportProgress(80, 'Generating manifest...');
      const manifest = this.generateManifest(file, fragments, options);

      // Finalizar métricas
      this.metrics.endTime = performance.now();
      this.metrics.totalTime = this.metrics.endTime - this.metrics.startTime;
      this.calculateFinalMetrics(file.size, fragments);

      this.reportProgress(100, 'Processing completed successfully!');

      return {
        success: true,
        fragments,
        manifest,
        metrics: this.metrics
      };

    } catch (error) {
      return this.handleProcessingError(error);
    }
  }

  /**
   * Lee y parsea el archivo ZIP
   */
  private async readZipFile(file: File): Promise<JSZip> {
    try {
      const zip = new JSZip();
      const arrayBuffer = await this.readFileProgressively(file);
      return await zip.loadAsync(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to read ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lee archivo de forma progresiva para mostrar progreso
   */
  private async readFileProgressively(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onabort = () => reject(new Error('FileReader aborted'));
      
      // Para archivos grandes, se podría implementar lectura por chunks
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Analiza el contenido del ZIP
   */
  private async analyzeZipContents(zip: JSZip): Promise<{
    totalEntries: number;
    totalUncompressedSize: number;
    largestFile: number;
    fileTypes: Record<string, number>;
  }> {
    let totalUncompressedSize = 0;
    let largestFile = 0;
    const fileTypes: Record<string, number> = {};
    
    const entries = Object.values(zip.files);
    
    for (const entry of entries) {
      if (!entry.dir) {
        const size = entry._data?.uncompressedSize || 0;
        totalUncompressedSize += size;
        largestFile = Math.max(largestFile, size);
        
        // Contar tipos de archivo
        const extension = entry.name.split('.').pop()?.toLowerCase() || 'unknown';
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      }
    }

    return {
      totalEntries: entries.filter(e => !e.dir).length,
      totalUncompressedSize,
      largestFile,
      fileTypes
    };
  }

  /**
   * Crea fragmentos del archivo según las opciones
   */
  private async createFragments(
    zip: JSZip,
    options: ProcessingOptions,
    analysis: any
  ): Promise<ProcessedFragment[]> {
    const fragments: ProcessedFragment[] = [];
    const entries = Object.values(zip.files).filter(entry => !entry.dir);
    
    let currentFragmentSize = 0;
    let currentFragmentEntries: typeof entries = [];
    let fragmentIndex = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entrySize = entry._data?.uncompressedSize || 0;
      
      // Si agregar esta entrada excede el tamaño del fragmento, crear fragmento actual
      if (currentFragmentSize + entrySize > options.fragmentSize && currentFragmentEntries.length > 0) {
        const fragment = await this.createFragmentFromEntries(
          currentFragmentEntries,
          fragmentIndex,
          options
        );
        fragments.push(fragment);
        
        // Reiniciar para el próximo fragmento
        currentFragmentEntries = [entry];
        currentFragmentSize = entrySize;
        fragmentIndex++;
        
        this.reportProgress(
          40 + Math.round((i / entries.length) * 40),
          `Creating fragment ${fragmentIndex + 1}...`
        );
      } else {
        currentFragmentEntries.push(entry);
        currentFragmentSize += entrySize;
      }
    }

    // Crear el último fragmento si hay entradas restantes
    if (currentFragmentEntries.length > 0) {
      const fragment = await this.createFragmentFromEntries(
        currentFragmentEntries,
        fragmentIndex,
        options
      );
      fragments.push(fragment);
    }

    return fragments;
  }

  /**
   * Crea un fragmento ZIP a partir de entradas
   */
  private async createFragmentFromEntries(
    entries: JSZip.JSZipObject[],
    index: number,
    options: ProcessingOptions
  ): Promise<ProcessedFragment> {
    const fragmentZip = new JSZip();
    const fragmentId = `fragment_${index.toString().padStart(3, '0')}`;
    
    // Agregar archivos al fragmento
    for (const entry of entries) {
      const content = await entry.async('arraybuffer');
      fragmentZip.file(entry.name, content);
    }

    // Generar el ZIP del fragmento
    const fragmentBlob = await fragmentZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: options.compressionLevel
      }
    });

    // Calcular checksum
    const checksum = await this.calculateChecksum(fragmentBlob);
    
    // Crear nombre del fragmento
    const originalName = options.customFilename || 'archive';
    const fragmentName = `${originalName}_part${(index + 1).toString().padStart(3, '0')}.zip`;

    return {
      id: fragmentId,
      name: fragmentName,
      size: fragmentBlob.size,
      blob: fragmentBlob,
      checksum
    };
  }

  /**
   * Genera manifest del procesamiento
   */
  private generateManifest(
    originalFile: File,
    fragments: ProcessedFragment[],
    options: ProcessingOptions
  ): ProcessingManifest {
    return {
      originalFile: {
        name: originalFile.name,
        size: originalFile.size,
        checksum: '' // Se calculará después si es necesario
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
        strategy: options.strategy,
        compressionLevel: options.compressionLevel
      }
    };
  }

  /**
   * Descarga todos los fragmentos
   */
  public async downloadFragments(fragments: ProcessedFragment[]): Promise<void> {
    this.reportProgress(0, 'Preparing downloads...');
    
    for (let i = 0; i < fragments.length; i++) {
      const fragment = fragments[i];
      
      if (fragment.blob) {
        saveAs(fragment.blob, fragment.name);
        
        this.reportProgress(
          Math.round(((i + 1) / fragments.length) * 100),
          `Downloaded ${fragment.name}`
        );
        
        // Pequeña pausa entre descargas para evitar problemas del navegador
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    this.reportProgress(100, 'All fragments downloaded!');
  }

  /**
   * Descarga el manifest
   */
  public downloadManifest(manifest: ProcessingManifest): void {
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json'
    });
    saveAs(manifestBlob, 'manifest.json');
  }

  /**
   * Calcula checksum de un blob
   */
  private async calculateChecksum(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Valida opciones de procesamiento
   */
  private validateProcessingOptions(options: ProcessingOptions): void {
    if (options.fragmentSize <= 0) {
      throw new Error('Fragment size must be greater than 0');
    }
    
    if (options.compressionLevel < 0 || options.compressionLevel > 9) {
      throw new Error('Compression level must be between 0 and 9');
    }
    
    if (options.strategy !== 'CLIENT_SIDE') {
      throw new Error('ZipProcessor only supports CLIENT_SIDE strategy');
    }
  }

  /**
   * Verifica disponibilidad de memoria
   */
  private async checkMemoryAvailability(fileSize: number): Promise<void> {
    // Estimar memoria necesaria (aproximadamente 3x el tamaño del archivo)
    const estimatedMemoryUsage = fileSize * 3;
    
    if (estimatedMemoryUsage > MAX_MEMORY_USAGE) {
      throw new Error(
        `File too large for client-side processing. ` +
        `Estimated memory usage: ${Math.round(estimatedMemoryUsage / (1024 * 1024))}MB. ` +
        `Maximum allowed: ${Math.round(MAX_MEMORY_USAGE / (1024 * 1024))}MB.`
      );
    }

    // Verificar memoria disponible si la API está disponible
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      const availableMemory = memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
      
      if (estimatedMemoryUsage > availableMemory * 0.8) {
        throw new Error('Insufficient memory available for processing');
      }
    }
  }

  /**
   * Maneja errores de procesamiento
   */
  private handleProcessingError(error: unknown): ProcessingResult {
    const processingError: ProcessingError = {
      code: 'PROCESSING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown processing error',
      details: error instanceof Error ? error.stack : undefined,
      recoverable: false,
      suggestedAction: 'Try with a smaller file or use Google Drive integration for large files'
    };

    // Finalizar métricas en caso de error
    this.metrics.endTime = performance.now();
    this.metrics.totalTime = this.metrics.endTime - this.metrics.startTime;

    return {
      success: false,
      fragments: [],
      error: processingError,
      metrics: this.metrics
    };
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
   * Inicializa métricas
   */
  private initializeMetrics(): ProcessingMetrics {
    return {
      startTime: 0,
      endTime: 0,
      totalTime: 0,
      memoryUsage: 0,
      compressionRatio: 0,
      throughput: 0
    };
  }

  /**
   * Calcula métricas finales
   */
  private calculateFinalMetrics(originalSize: number, fragments: ProcessedFragment[]): void {
    const totalFragmentSize = fragments.reduce((sum, fragment) => sum + fragment.size, 0);
    
    this.metrics.compressionRatio = originalSize > 0 ? totalFragmentSize / originalSize : 1;
    this.metrics.throughput = this.metrics.totalTime > 0 ? originalSize / (this.metrics.totalTime / 1000) : 0;
    
    // Estimar uso de memoria (aproximación)
    this.metrics.memoryUsage = Math.max(originalSize * 2, totalFragmentSize);
  }

  /**
   * Cancela el procesamiento en curso
   */
  public abort(): void {
    this.abortController.abort();
  }

  /**
   * Limpia recursos
   */
  public dispose(): void {
    this.abort();
    this.progressCallback = undefined;
  }
}