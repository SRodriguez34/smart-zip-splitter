/**
 * Processing Types for Smart ZIP Splitter
 * Contains type definitions for file processing and strategies
 */

export type ProcessingStrategyType = 'CLIENT_SIDE' | 'CLIENT_DRIVE' | 'SERVER_PREMIUM';
export type StorageLocation = 'browser' | 'google-drive' | 'server';

export interface ProcessingStrategy {
  type: ProcessingStrategyType;
  maxSize: number; // En bytes
  name: string;
  description: string;
  features: string[];
  recommended: boolean;
  icon: string;
  color: string;
}

export interface StrategyConfig {
  targetFragmentSize: number; // En MB
  estimatedFragments: number;
  processingTime: number; // En segundos
  storageLocation: StorageLocation;
  compressionLevel: number; // 0-9
  useWebWorker: boolean;
}

export interface FileAnalysis {
  size: number;
  type: string;
  name: string;
  entryCount: number;
  compressionRatio: number;
  estimatedProcessingTime: number;
  recommendedStrategy: ProcessingStrategyType;
  recommendedFragmentSize: number;
}

export interface ProcessingOptions {
  strategy: ProcessingStrategyType;
  fragmentSize: number; // En bytes
  compressionLevel: number;
  customFilename?: string;
  includeManifest: boolean;
  preserveStructure: boolean;
}

export interface ProcessingResult {
  success: boolean;
  fragments: ProcessedFragment[];
  manifest?: ProcessingManifest;
  error?: ProcessingError;
  metrics: ProcessingMetrics;
}

export interface ProcessedFragment {
  id: string;
  name: string;
  size: number;
  blob?: Blob;
  downloadUrl?: string;
  driveFileId?: string;
  checksum: string;
}

export interface ProcessingManifest {
  originalFile: {
    name: string;
    size: number;
    checksum: string;
  };
  fragments: {
    id: string;
    name: string;
    size: number;
    checksum: string;
    order: number;
  }[];
  metadata: {
    createdAt: string;
    version: string;
    strategy: ProcessingStrategyType;
    compressionLevel: number;
  };
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  totalTime: number;
  memoryUsage: number;
  compressionRatio: number;
  throughput: number; // bytes per second
}