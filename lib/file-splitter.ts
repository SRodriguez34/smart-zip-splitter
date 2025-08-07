/**
 * File Splitter
 * Algoritmos inteligentes para dividir archivos ZIP de manera óptima
 */

import JSZip from 'jszip';
import type { ProcessedFragment } from '@/types/processing';

export type SplittingStrategy = 'size-based' | 'file-based' | 'balanced' | 'smart';

export interface SplittingOptions {
  strategy: SplittingStrategy;
  targetFragmentSize: number; // En bytes
  maxFragments?: number;
  preserveDirectoryStructure: boolean;
  balanceFragmentSizes: boolean;
  prioritizeLargeFiles: boolean;
  groupSimilarFiles: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  directory: string;
  zipEntry: JSZip.JSZipObject;
}

export interface FragmentPlan {
  id: string;
  name: string;
  entries: FileEntry[];
  estimatedSize: number;
  compressionRatio: number;
  priority: number;
}

/**
 * Clase principal para división inteligente de archivos
 */
export class FileSplitter {
  private options: SplittingOptions;
  private progressCallback?: (progress: number, message: string) => void;

  constructor(options: SplittingOptions) {
    this.options = { ...options };
  }

  /**
   * Establece callback para reportar progreso
   */
  public setProgressCallback(callback: (progress: number, message: string) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Analiza un archivo ZIP y crea un plan de división
   */
  public async createSplittingPlan(zip: JSZip): Promise<FragmentPlan[]> {
    this.reportProgress(0, 'Analyzing ZIP structure...');

    // Extraer y analizar archivos
    const fileEntries = await this.extractFileEntries(zip);
    this.reportProgress(20, 'Categorizing files...');

    // Aplicar estrategia de división
    const fragments = await this.applySplittingStrategy(fileEntries);
    this.reportProgress(60, 'Optimizing fragment distribution...');

    // Optimizar distribución
    const optimizedFragments = await this.optimizeFragments(fragments);
    this.reportProgress(80, 'Calculating compression ratios...');

    // Calcular ratios de compresión
    const finalFragments = await this.calculateCompressionRatios(optimizedFragments);
    this.reportProgress(100, 'Splitting plan completed!');

    return finalFragments;
  }

  /**
   * Extrae información detallada de los archivos en el ZIP
   */
  private async extractFileEntries(zip: JSZip): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const name = path.split('/').pop() || path;
        const extension = name.split('.').pop()?.toLowerCase() || '';
        const directory = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
        const size = zipEntry._data?.uncompressedSize || 0;
        
        entries.push({
          name,
          path,
          size,
          type: this.getFileType(extension),
          extension,
          directory,
          zipEntry
        });
      }
    }

    return entries.sort((a, b) => {
      // Ordenar por directorio y luego por tamaño (descendente)
      if (a.directory !== b.directory) {
        return a.directory.localeCompare(b.directory);
      }
      return b.size - a.size;
    });
  }

  /**
   * Aplica la estrategia de división seleccionada
   */
  private async applySplittingStrategy(entries: FileEntry[]): Promise<FragmentPlan[]> {
    switch (this.options.strategy) {
      case 'size-based':
        return this.createSizeBasedFragments(entries);
      case 'file-based':
        return this.createFileBasedFragments(entries);
      case 'balanced':
        return this.createBalancedFragments(entries);
      case 'smart':
        return this.createSmartFragments(entries);
      default:
        throw new Error(`Unknown splitting strategy: ${this.options.strategy}`);
    }
  }

  /**
   * Estrategia basada en tamaño: divide por tamaño objetivo
   */
  private createSizeBasedFragments(entries: FileEntry[]): FragmentPlan[] {
    const fragments: FragmentPlan[] = [];
    let currentFragment: FileEntry[] = [];
    let currentSize = 0;
    let fragmentIndex = 0;

    for (const entry of entries) {
      // Si el archivo es muy grande, crear un fragmento dedicado
      if (entry.size > this.options.targetFragmentSize * 0.8) {
        // Finalizar fragmento actual si tiene contenido
        if (currentFragment.length > 0) {
          fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex++));
          currentFragment = [];
          currentSize = 0;
        }
        
        // Crear fragmento dedicado para archivo grande
        fragments.push(this.createFragmentPlan([entry], fragmentIndex++));
        continue;
      }

      // Si agregar este archivo excede el tamaño objetivo
      if (currentSize + entry.size > this.options.targetFragmentSize && currentFragment.length > 0) {
        fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex++));
        currentFragment = [entry];
        currentSize = entry.size;
      } else {
        currentFragment.push(entry);
        currentSize += entry.size;
      }
    }

    // Agregar último fragmento si tiene contenido
    if (currentFragment.length > 0) {
      fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex));
    }

    return fragments;
  }

  /**
   * Estrategia basada en archivos: distribución equitativa de archivos
   */
  private createFileBasedFragments(entries: FileEntry[]): FragmentPlan[] {
    const totalFiles = entries.length;
    const estimatedFragments = Math.ceil(entries.reduce((sum, e) => sum + e.size, 0) / this.options.targetFragmentSize);
    const filesPerFragment = Math.ceil(totalFiles / estimatedFragments);
    
    const fragments: FragmentPlan[] = [];
    
    for (let i = 0; i < totalFiles; i += filesPerFragment) {
      const fragmentEntries = entries.slice(i, i + filesPerFragment);
      fragments.push(this.createFragmentPlan(fragmentEntries, fragments.length));
    }

    return fragments;
  }

  /**
   * Estrategia balanceada: optimiza tanto tamaño como número de archivos
   */
  private createBalancedFragments(entries: FileEntry[]): FragmentPlan[] {
    // Separar archivos grandes y pequeños
    const largeFiles = entries.filter(e => e.size > this.options.targetFragmentSize * 0.3);
    const smallFiles = entries.filter(e => e.size <= this.options.targetFragmentSize * 0.3);
    
    const fragments: FragmentPlan[] = [];
    let fragmentIndex = 0;

    // Procesar archivos grandes (cada uno en su propio fragmento o agrupados inteligentemente)
    for (const largeFile of largeFiles) {
      if (largeFile.size > this.options.targetFragmentSize * 0.8) {
        fragments.push(this.createFragmentPlan([largeFile], fragmentIndex++));
      } else {
        // Intentar agrupar archivos grandes relacionados
        const relatedFiles = largeFiles.filter(f => 
          f !== largeFile && 
          f.directory === largeFile.directory &&
          !fragments.some(frag => frag.entries.includes(f))
        );
        
        const fragmentFiles = [largeFile];
        let fragmentSize = largeFile.size;
        
        for (const related of relatedFiles) {
          if (fragmentSize + related.size <= this.options.targetFragmentSize) {
            fragmentFiles.push(related);
            fragmentSize += related.size;
          }
        }
        
        fragments.push(this.createFragmentPlan(fragmentFiles, fragmentIndex++));
      }
    }

    // Procesar archivos pequeños
    const remainingSmallFiles = smallFiles.filter(f => 
      !fragments.some(frag => frag.entries.includes(f))
    );

    let currentFragment: FileEntry[] = [];
    let currentSize = 0;

    for (const smallFile of remainingSmallFiles) {
      if (currentSize + smallFile.size > this.options.targetFragmentSize && currentFragment.length > 0) {
        fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex++));
        currentFragment = [smallFile];
        currentSize = smallFile.size;
      } else {
        currentFragment.push(smallFile);
        currentSize += smallFile.size;
      }
    }

    if (currentFragment.length > 0) {
      fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex));
    }

    return fragments;
  }

  /**
   * Estrategia inteligente: combina múltiples heurísticas
   */
  private createSmartFragments(entries: FileEntry[]): FragmentPlan[] {
    // Agrupar archivos por directorio y tipo
    const directoryGroups = this.groupByDirectory(entries);
    const typeGroups = this.groupByType(entries);
    
    const fragments: FragmentPlan[] = [];
    let fragmentIndex = 0;
    const processedEntries = new Set<FileEntry>();

    // 1. Procesar directorios que pueden formar fragmentos completos
    for (const [directory, dirEntries] of directoryGroups) {
      const totalSize = dirEntries.reduce((sum, e) => sum + e.size, 0);
      
      // Si el directorio completo encaja en un fragmento
      if (totalSize <= this.options.targetFragmentSize * 1.1 && totalSize >= this.options.targetFragmentSize * 0.3) {
        fragments.push(this.createFragmentPlan(dirEntries, fragmentIndex++, directory));
        dirEntries.forEach(e => processedEntries.add(e));
      }
    }

    // 2. Procesar archivos grandes individualmente
    const remainingEntries = entries.filter(e => !processedEntries.has(e));
    const largeFiles = remainingEntries.filter(e => e.size > this.options.targetFragmentSize * 0.5);
    
    for (const largeFile of largeFiles) {
      fragments.push(this.createFragmentPlan([largeFile], fragmentIndex++));
      processedEntries.add(largeFile);
    }

    // 3. Agrupar archivos restantes por tipo y tamaño
    const finalRemainingEntries = entries.filter(e => !processedEntries.has(e));
    const groupedByType = this.groupByType(finalRemainingEntries);
    
    for (const [type, typeEntries] of groupedByType) {
      let currentFragment: FileEntry[] = [];
      let currentSize = 0;

      // Ordenar por tamaño descendente para mejor empaquetado
      const sortedEntries = typeEntries.sort((a, b) => b.size - a.size);

      for (const entry of sortedEntries) {
        if (currentSize + entry.size > this.options.targetFragmentSize && currentFragment.length > 0) {
          fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex++, `${type}_files`));
          currentFragment = [entry];
          currentSize = entry.size;
        } else {
          currentFragment.push(entry);
          currentSize += entry.size;
        }
      }

      if (currentFragment.length > 0) {
        fragments.push(this.createFragmentPlan(currentFragment, fragmentIndex++, `${type}_files`));
      }
    }

    return fragments;
  }

  /**
   * Optimiza la distribución de fragmentos
   */
  private async optimizeFragments(fragments: FragmentPlan[]): Promise<FragmentPlan[]> {
    if (!this.options.balanceFragmentSizes) {
      return fragments;
    }

    // Balancear tamaños de fragmentos
    const optimized = [...fragments];
    let improved = true;
    
    while (improved) {
      improved = false;
      
      for (let i = 0; i < optimized.length - 1; i++) {
        for (let j = i + 1; j < optimized.length; j++) {
          const fragment1 = optimized[i];
          const fragment2 = optimized[j];
          
          // Intentar intercambiar archivos para balancear tamaños
          const balanceImprovement = this.tryBalanceFragments(fragment1, fragment2);
          if (balanceImprovement) {
            improved = true;
          }
        }
      }
    }

    return optimized;
  }

  /**
   * Intenta balancear dos fragmentos intercambiando archivos
   */
  private tryBalanceFragments(fragment1: FragmentPlan, fragment2: FragmentPlan): boolean {
    const target = this.options.targetFragmentSize;
    const diff1 = Math.abs(fragment1.estimatedSize - target);
    const diff2 = Math.abs(fragment2.estimatedSize - target);
    const currentImbalance = diff1 + diff2;
    
    // Buscar intercambios que mejoren el balance
    for (const entry1 of fragment1.entries) {
      for (const entry2 of fragment2.entries) {
        const newSize1 = fragment1.estimatedSize - entry1.size + entry2.size;
        const newSize2 = fragment2.estimatedSize - entry2.size + entry1.size;
        
        const newDiff1 = Math.abs(newSize1 - target);
        const newDiff2 = Math.abs(newSize2 - target);
        const newImbalance = newDiff1 + newDiff2;
        
        if (newImbalance < currentImbalance * 0.95) { // Mejora significativa
          // Realizar intercambio
          const idx1 = fragment1.entries.indexOf(entry1);
          const idx2 = fragment2.entries.indexOf(entry2);
          
          fragment1.entries[idx1] = entry2;
          fragment2.entries[idx2] = entry1;
          fragment1.estimatedSize = newSize1;
          fragment2.estimatedSize = newSize2;
          
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Calcula ratios de compresión estimados para cada fragmento
   */
  private async calculateCompressionRatios(fragments: FragmentPlan[]): Promise<FragmentPlan[]> {
    return fragments.map((fragment, index) => ({
      ...fragment,
      compressionRatio: this.estimateCompressionRatio(fragment.entries),
      priority: this.calculateFragmentPriority(fragment, index)
    }));
  }

  /**
   * Crea un plan de fragmento a partir de archivos
   */
  private createFragmentPlan(entries: FileEntry[], index: number, customName?: string): FragmentPlan {
    const estimatedSize = entries.reduce((sum, e) => sum + e.size, 0);
    const name = customName || `fragment_${index.toString().padStart(3, '0')}`;
    
    return {
      id: `fragment_${index}`,
      name,
      entries: [...entries],
      estimatedSize,
      compressionRatio: 1, // Se calculará después
      priority: 0 // Se calculará después
    };
  }

  /**
   * Agrupa archivos por directorio
   */
  private groupByDirectory(entries: FileEntry[]): Map<string, FileEntry[]> {
    const groups = new Map<string, FileEntry[]>();
    
    for (const entry of entries) {
      const directory = entry.directory || 'root';
      if (!groups.has(directory)) {
        groups.set(directory, []);
      }
      groups.get(directory)!.push(entry);
    }
    
    return groups;
  }

  /**
   * Agrupa archivos por tipo
   */
  private groupByType(entries: FileEntry[]): Map<string, FileEntry[]> {
    const groups = new Map<string, FileEntry[]>();
    
    for (const entry of entries) {
      const type = entry.type;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(entry);
    }
    
    return groups;
  }

  /**
   * Determina el tipo de archivo basado en la extensión
   */
  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      // Código
      'js': 'code', 'ts': 'code', 'jsx': 'code', 'tsx': 'code',
      'html': 'code', 'css': 'code', 'scss': 'code', 'sass': 'code',
      'php': 'code', 'py': 'code', 'java': 'code', 'cpp': 'code', 'c': 'code',
      
      // Imágenes
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
      'webp': 'image', 'svg': 'image', 'bmp': 'image', 'ico': 'image',
      
      // Documentos
      'pdf': 'document', 'doc': 'document', 'docx': 'document',
      'txt': 'document', 'rtf': 'document', 'odt': 'document',
      
      // Media
      'mp4': 'media', 'avi': 'media', 'mov': 'media', 'wmv': 'media',
      'mp3': 'media', 'wav': 'media', 'flac': 'media', 'm4a': 'media',
      
      // Archivos
      'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive',
      
      // Datos
      'json': 'data', 'xml': 'data', 'csv': 'data', 'sql': 'data',
    };
    
    return typeMap[extension] || 'other';
  }

  /**
   * Estima el ratio de compresión de un grupo de archivos
   */
  private estimateCompressionRatio(entries: FileEntry[]): number {
    const typeRatios: Record<string, number> = {
      'code': 0.3,
      'document': 0.6,
      'data': 0.4,
      'image': 0.95,
      'media': 0.98,
      'archive': 0.99,
      'other': 0.7
    };
    
    let totalSize = 0;
    let weightedRatio = 0;
    
    for (const entry of entries) {
      const ratio = typeRatios[entry.type] || typeRatios.other;
      weightedRatio += entry.size * ratio;
      totalSize += entry.size;
    }
    
    return totalSize > 0 ? weightedRatio / totalSize : 0.7;
  }

  /**
   * Calcula la prioridad de un fragmento
   */
  private calculateFragmentPriority(fragment: FragmentPlan, index: number): number {
    let priority = 0;
    
    // Prioridad basada en tamaño (fragmentos más balanceados tienen mayor prioridad)
    const sizeDiff = Math.abs(fragment.estimatedSize - this.options.targetFragmentSize);
    const sizeScore = 1 - (sizeDiff / this.options.targetFragmentSize);
    priority += sizeScore * 0.3;
    
    // Prioridad basada en tipo de archivos
    const codeFiles = fragment.entries.filter(e => e.type === 'code').length;
    const imageFiles = fragment.entries.filter(e => e.type === 'image').length;
    
    if (codeFiles > imageFiles) priority += 0.2; // Código tiene prioridad
    if (fragment.entries.length < 10) priority += 0.1; // Fragmentos pequeños tienen prioridad
    
    // Penalizar fragmentos muy tarde en la secuencia
    priority -= index * 0.01;
    
    return Math.max(0, Math.min(1, priority));
  }

  /**
   * Reporta progreso
   */
  private reportProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(Math.min(100, Math.max(0, progress)), message);
    }
  }
}