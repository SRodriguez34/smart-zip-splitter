/**
 * Strategy Selector
 * Sistema de decisión automática para seleccionar la mejor estrategia de procesamiento
 */

import type { 
  ProcessingStrategy, 
  ProcessingStrategyType, 
  StrategyConfig, 
  FileAnalysis,
  StorageLocation 
} from '@/types/processing';

// Constantes de configuración
const STRATEGY_THRESHOLDS = {
  CLIENT_SIDE_MAX: 100 * 1024 * 1024, // 100MB
  CLIENT_DRIVE_MAX: 2 * 1024 * 1024 * 1024, // 2GB
  SERVER_PREMIUM_MIN: 2 * 1024 * 1024 * 1024, // 2GB+
} as const;

const DEFAULT_FRAGMENT_SIZES = {
  CLIENT_SIDE: 25 * 1024 * 1024, // 25MB fragments for client-side
  CLIENT_DRIVE: 100 * 1024 * 1024, // 100MB fragments for Google Drive
  SERVER_PREMIUM: 500 * 1024 * 1024, // 500MB fragments for server
} as const;

/**
 * Definición de estrategias disponibles
 */
export const AVAILABLE_STRATEGIES: Record<ProcessingStrategyType, ProcessingStrategy> = {
  CLIENT_SIDE: {
    type: 'CLIENT_SIDE',
    maxSize: STRATEGY_THRESHOLDS.CLIENT_SIDE_MAX,
    name: 'Lightning Fast',
    description: 'Instant client-side processing with zero upload required',
    features: [
      'Instant processing in your browser',
      'Complete privacy - files never leave your device',
      'No internet required after page load',
      'Perfect for sensitive documents',
      'Direct download links',
    ],
    recommended: true,
    icon: 'Zap',
    color: 'blue',
  },
  CLIENT_DRIVE: {
    type: 'CLIENT_DRIVE',
    maxSize: STRATEGY_THRESHOLDS.CLIENT_DRIVE_MAX,
    name: 'Smart Cloud Integration',
    description: 'Google Drive integration for large files with automatic sharing',
    features: [
      'Automatic Google Drive upload',
      'Shareable links generation',
      'Organized folder structure',
      'Team collaboration ready',
      'Version history in Drive',
    ],
    recommended: false,
    icon: 'HardDrive',
    color: 'green',
  },
  SERVER_PREMIUM: {
    type: 'SERVER_PREMIUM',
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    name: 'Enterprise Processing',
    description: 'High-performance server processing for massive files',
    features: [
      'Handles massive files (10GB+)',
      'Advanced compression algorithms',
      'Priority processing queue',
      'Enterprise security standards',
      'API access included',
    ],
    recommended: false,
    icon: 'Server',
    color: 'purple',
  },
};

/**
 * Analiza un archivo y determina la mejor estrategia de procesamiento
 */
export async function analyzeFile(file: File): Promise<FileAnalysis> {
  const startTime = performance.now();
  
  try {
    // Análisis básico del archivo
    const basicAnalysis = {
      size: file.size,
      type: file.type,
      name: file.name,
    };

    // Estimación de entradas ZIP (aproximación basada en tamaño)
    const estimatedEntryCount = Math.max(1, Math.floor(file.size / (50 * 1024))); // ~50KB por entrada promedio

    // Estimación de ratio de compresión (basado en tipo de archivo)
    const compressionRatio = estimateCompressionRatio(file.name);

    // Selección automática de estrategia
    const recommendedStrategy = selectOptimalStrategy(file.size);

    // Cálculo de tamaño de fragmento recomendado
    const recommendedFragmentSize = calculateOptimalFragmentSize(file.size, recommendedStrategy);

    // Estimación de tiempo de procesamiento
    const estimatedProcessingTime = estimateProcessingTime(file.size, recommendedStrategy);

    const endTime = performance.now();

    return {
      size: basicAnalysis.size,
      type: basicAnalysis.type,
      name: basicAnalysis.name,
      entryCount: estimatedEntryCount,
      compressionRatio,
      estimatedProcessingTime,
      recommendedStrategy,
      recommendedFragmentSize,
    };

  } catch (error) {
    throw new Error(`Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Selecciona la estrategia óptima basada en el tamaño del archivo
 */
export function selectOptimalStrategy(fileSize: number): ProcessingStrategyType {
  if (fileSize <= STRATEGY_THRESHOLDS.CLIENT_SIDE_MAX) {
    return 'CLIENT_SIDE';
  } else if (fileSize <= STRATEGY_THRESHOLDS.CLIENT_DRIVE_MAX) {
    return 'CLIENT_DRIVE';
  } else {
    return 'SERVER_PREMIUM';
  }
}

/**
 * Genera configuración para una estrategia específica
 */
export function generateStrategyConfig(
  strategy: ProcessingStrategyType,
  fileSize: number,
  customFragmentSize?: number
): StrategyConfig {
  const fragmentSize = customFragmentSize || calculateOptimalFragmentSize(fileSize, strategy);
  const estimatedFragments = Math.ceil(fileSize / fragmentSize);
  const processingTime = estimateProcessingTime(fileSize, strategy);
  
  const storageLocation: StorageLocation = {
    CLIENT_SIDE: 'browser',
    CLIENT_DRIVE: 'google-drive',
    SERVER_PREMIUM: 'server',
  }[strategy];

  return {
    targetFragmentSize: Math.round(fragmentSize / (1024 * 1024)), // Convert to MB
    estimatedFragments,
    processingTime,
    storageLocation,
    compressionLevel: getOptimalCompressionLevel(strategy, fileSize),
    useWebWorker: shouldUseWebWorker(strategy, fileSize),
  };
}

/**
 * Calcula el tamaño óptimo de fragmento basado en la estrategia y tamaño del archivo
 */
export function calculateOptimalFragmentSize(fileSize: number, strategy: ProcessingStrategyType): number {
  const baseFragmentSize = DEFAULT_FRAGMENT_SIZES[strategy];
  
  // Ajuste dinámico basado en el tamaño del archivo
  if (strategy === 'CLIENT_SIDE') {
    // Para archivos muy pequeños, usar fragmentos más pequeños
    if (fileSize < 10 * 1024 * 1024) { // < 10MB
      return Math.min(baseFragmentSize, fileSize / 2);
    }
    // Para archivos cerca del límite, usar fragmentos más grandes
    if (fileSize > 75 * 1024 * 1024) { // > 75MB
      return Math.min(50 * 1024 * 1024, fileSize / 3); // Máximo 50MB
    }
  }
  
  if (strategy === 'CLIENT_DRIVE') {
    // Optimizar para Google Drive API limits
    const driveOptimalSize = 100 * 1024 * 1024; // 100MB es óptimo para Drive
    return Math.min(driveOptimalSize, Math.max(baseFragmentSize, fileSize / 10));
  }
  
  if (strategy === 'SERVER_PREMIUM') {
    // Usar fragmentos más grandes para archivos masivos
    return Math.min(baseFragmentSize, Math.max(100 * 1024 * 1024, fileSize / 20));
  }

  return baseFragmentSize;
}

/**
 * Estima el tiempo de procesamiento basado en el tamaño del archivo y estrategia
 */
export function estimateProcessingTime(fileSize: number, strategy: ProcessingStrategyType): number {
  const fileSizeMB = fileSize / (1024 * 1024);
  
  // Tasas de procesamiento por estrategia (MB/segundo)
  const processingRates = {
    CLIENT_SIDE: 15, // 15 MB/s en cliente promedio
    CLIENT_DRIVE: 8, // 8 MB/s incluyendo upload a Drive
    SERVER_PREMIUM: 50, // 50 MB/s en servidor optimizado
  };
  
  const baseTime = fileSizeMB / processingRates[strategy];
  
  // Agregar overhead fijo
  const overhead = {
    CLIENT_SIDE: 2, // 2 segundos de overhead
    CLIENT_DRIVE: 5, // 5 segundos de overhead (auth, etc.)
    SERVER_PREMIUM: 3, // 3 segundos de overhead
  };
  
  return Math.round(baseTime + overhead[strategy]);
}

/**
 * Estima el ratio de compresión basado en el nombre del archivo
 */
function estimateCompressionRatio(filename: string): number {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  // Ratios típicos basados en tipos de archivo
  const compressionRatios: Record<string, number> = {
    // Archivos ya comprimidos
    zip: 0.95,
    rar: 0.95,
    '7z': 0.95,
    gz: 0.95,
    bz2: 0.95,
    
    // Archivos de código/texto
    js: 0.3,
    ts: 0.3,
    html: 0.3,
    css: 0.3,
    txt: 0.4,
    json: 0.3,
    xml: 0.3,
    
    // Archivos de imagen
    jpg: 0.95,
    jpeg: 0.95,
    png: 0.8,
    gif: 0.9,
    webp: 0.95,
    
    // Archivos de video/audio
    mp4: 0.98,
    avi: 0.97,
    mov: 0.97,
    mp3: 0.98,
    wav: 0.6,
    
    // Documentos
    pdf: 0.8,
    doc: 0.6,
    docx: 0.7,
    
    // Por defecto
    default: 0.6,
  };
  
  return compressionRatios[extension] || compressionRatios.default;
}

/**
 * Determina el nivel óptimo de compresión
 */
function getOptimalCompressionLevel(strategy: ProcessingStrategyType, fileSize: number): number {
  // Nivel de compresión (0=sin compresión, 9=máxima compresión)
  if (strategy === 'CLIENT_SIDE') {
    // Priorizar velocidad para procesamiento local
    return fileSize > 50 * 1024 * 1024 ? 3 : 6;
  } else if (strategy === 'CLIENT_DRIVE') {
    // Balance entre tamaño y velocidad para upload
    return 6;
  } else {
    // Máxima compresión para servidor
    return 9;
  }
}

/**
 * Determina si se debe usar Web Worker
 */
function shouldUseWebWorker(strategy: ProcessingStrategyType, fileSize: number): boolean {
  // Usar Web Worker para archivos grandes que podrían bloquear la UI
  const threshold = 10 * 1024 * 1024; // 10MB
  
  return strategy === 'CLIENT_SIDE' && fileSize > threshold;
}

/**
 * Obtiene todas las estrategias disponibles para un tamaño de archivo dado
 */
export function getAvailableStrategies(fileSize: number): ProcessingStrategy[] {
  return Object.values(AVAILABLE_STRATEGIES).filter(
    strategy => fileSize <= strategy.maxSize
  );
}

/**
 * Valida si una estrategia es compatible con un archivo
 */
export function isStrategyCompatible(strategy: ProcessingStrategyType, fileSize: number): boolean {
  return fileSize <= AVAILABLE_STRATEGIES[strategy].maxSize;
}

/**
 * Obtiene recomendaciones personalizadas basadas en el análisis del archivo
 */
export function getPersonalizedRecommendations(analysis: FileAnalysis): {
  primary: ProcessingStrategy;
  alternatives: ProcessingStrategy[];
  reasoning: string;
} {
  const availableStrategies = getAvailableStrategies(analysis.size);
  const primary = AVAILABLE_STRATEGIES[analysis.recommendedStrategy];
  const alternatives = availableStrategies.filter(s => s.type !== analysis.recommendedStrategy);
  
  let reasoning = '';
  
  if (analysis.recommendedStrategy === 'CLIENT_SIDE') {
    reasoning = `Recommended for instant processing. Your ${(analysis.size / (1024 * 1024)).toFixed(1)}MB file will be processed locally in approximately ${analysis.estimatedProcessingTime} seconds.`;
  } else if (analysis.recommendedStrategy === 'CLIENT_DRIVE') {
    reasoning = `Recommended for sharing. Your ${(analysis.size / (1024 * 1024)).toFixed(1)}MB file will be uploaded to Google Drive with automatic link sharing.`;
  } else {
    reasoning = `Recommended for large files. Your ${(analysis.size / (1024 * 1024 * 1024)).toFixed(1)}GB file requires server processing for optimal performance.`;
  }
  
  return {
    primary,
    alternatives,
    reasoning,
  };
}